import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {Round} from '../../models/round';
import {Task} from '../../models/task';
import {Today} from '../../models/today';
import {User} from '../../models/user';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap, writeUser} from '../../utils/user';

const firestore = getFirestore();

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  const roundId = data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(firestore, transaction, auth?.uid as string);
    const user = await User.data(userDocSnap, cryptoKey);

    const roundRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnap = await transaction.get(roundRef);

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    const roundDocSnapData = await Round.data(roundDocSnap, cryptoKey);

    // get all tasks
    const docsToRemovePromise: (Promise<DocumentSnapshot> | DocumentSnapshot)[] = [];
    for (const taskId of roundDocSnapData.tasksIds) {
      const taskRef = Task.ref(roundDocSnap.ref, taskId);
      docsToRemovePromise.push(transaction.get(taskRef));
    }

    const allTasksListOfDayRefsPromise: Promise<DocumentSnapshot<Today>>[] = [];

    // get all today's
    for (const todayId of roundDocSnapData.todaysIds) {
      const todayRef = Today.ref(roundDocSnap.ref, todayId);
      allTasksListOfDayRefsPromise.push(transaction.get(todayRef));
    }

    transactionWrite.delete(roundDocSnap.ref);

    const allTasksListOfDayRefs = await Promise.all(allTasksListOfDayRefsPromise);

    const decryptTodaysPromise = [];

    for (const todaySnap of allTasksListOfDayRefs) {
      docsToRemovePromise.push(todaySnap);
      decryptTodaysPromise.push(Today.data(todaySnap, cryptoKey).then((decryptedToday) => {
        for (const todayTaskId of decryptedToday.tasksIds) {
          docsToRemovePromise.push(transaction.get(todaySnap.ref.collection('task').doc(todayTaskId)));
        }
      }));
    }

    const docsToRemove = await Promise.all(decryptTodaysPromise).then(() => Promise.all(docsToRemovePromise));

    // remove all documents
    for (const doc of docsToRemove) {
      transactionWrite.delete(doc.ref);
    }

    // update user
    const roundIndexInUser = user.decryptedRounds.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    user.decryptedRounds.splice(roundIndexInUser, 1);

    writeUser(transactionWrite, userDocSnap, encrypt(user.decryptedRounds, cryptoKey).then((encryptedRounds) => {
      return {
        rounds: encryptedRounds
      };
    }));

    return transactionWrite.execute();

  }).then(() => ({
    details: 'Your round has been deleted 🤭'
  }));
};
