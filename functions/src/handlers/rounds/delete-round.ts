import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {Round} from '../../models/round';
import {Today, TodayDoc} from '../../models/today';
import {TodayTask} from '../../models/today-task';
import {User, UserDoc} from '../../models/user';
import {getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap, writeUser} from '../../utils/user';

const app = getFirestore();

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

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    const userData = await User.data(userDocSnap, cryptoKey);

    const roundRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnap = await transaction.get(roundRef);

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    const roundDocSnapData = await Round.data(roundDocSnap, cryptoKey);

    // get all tasks
    const docsToRemovePromise: (Promise<DocumentSnapshot> | DocumentSnapshot)[] = [];
    for (const taskId of roundDocSnapData.tasksIds) {
      docsToRemovePromise.push(transaction.get(roundDocSnap.ref.collection('task').doc(taskId)));
    }

    const allTasksListOfDayRefsPromise: Promise<DocumentSnapshot<Today, TodayDoc>>[] = [];

    // get all today's
    for (const todayId of roundDocSnapData.todayIds) {
      const todayRef = Today.ref(roundDocSnap.ref, todayId);
      allTasksListOfDayRefsPromise.push(transaction.get(todayRef));
    }

    transactionWrite.delete(roundDocSnap.ref);

    const allTasksListOfDayRefs = await Promise.all(allTasksListOfDayRefsPromise);

    const decryptTodayPromise = [];

    for (const todaySnap of allTasksListOfDayRefs) {
      docsToRemovePromise.push(todaySnap);
      decryptTodayPromise.push(Today.data(todaySnap, cryptoKey).then((decryptedToday) => {
        for (const todayTaskId of decryptedToday.todayTasksIds) {
          docsToRemovePromise.push(transaction.get(TodayTask.ref(todaySnap.ref, todayTaskId)));
        }
      }));
    }

    const docsToRemove = await Promise.all(decryptTodayPromise).then(() => Promise.all(docsToRemovePromise));

    // remove all documents
    for (const doc of docsToRemove) {
      transactionWrite.delete(doc.ref);
    }

    const roundsIdsInUser = userData.roundsIds;

    // update user
    const roundIndexInUser = roundsIdsInUser.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    roundsIdsInUser.splice(roundIndexInUser, 1);

    writeUser(transactionWrite, userDocSnap, {
      disabled: userData.disabled,
      roundsIds: roundsIdsInUser,
    } as UserDoc);

    return transactionWrite.execute();

  }).then(() => ({
    code: 200,
    body: {
      details: 'Your round has been deleted 🤭'
    }
  }));
};
