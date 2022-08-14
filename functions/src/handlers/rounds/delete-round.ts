import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from "../../helpers/transaction-write";
import {getUser, writeUser} from '../../helpers/user';
import {
  decrypt,
  decryptRound,
  decryptToday,
  encrypt,
  getCryptoKey
} from '../../security/security';
import DocumentSnapshot = firestore.DocumentSnapshot;
import DocumentData = firestore.DocumentData;

const app = firestore();

export const handler = async (roundId: any, callableContext: CallableContext): Promise<{[key: string]: string}> => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  testRequirement(!auth?.token.secretKey);
  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundsInUserDecryptPromise = decrypt(userDocSnap.data()?.rounds, cryptoKey);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    // get all documents
    const docsToRemove: Promise<DocumentSnapshot<DocumentData>>[] = [];

    // get all tasks
    for (const taskId of roundDocSnapData.tasksIds) {
      docsToRemove.push(transaction.get(roundDocSnap.ref.collection('task').doc(taskId)));
    }

    const allTasksListOfDayRefsPromise: Promise<DocumentSnapshot<DocumentData>>[] = [];

    // get all today's
    for (const todayId of roundDocSnapData.todaysIds) {
      const today = roundDocSnap.ref.collection('today').doc(todayId);
      allTasksListOfDayRefsPromise.push(transaction.get(today));
    }

    const decryptTodaysPromise = [];
    const allTasksListOfDayRefs = await Promise.all(allTasksListOfDayRefsPromise);
    for (const todaySnap of allTasksListOfDayRefs) {
      docsToRemove.push(new Promise(async (resolve) => resolve(todaySnap)));
      decryptTodaysPromise.push(decryptToday(todaySnap.data() as {value: string}, cryptoKey).then((decryptedToday) => {
        for (const todayTaskId of decryptedToday.tasksIds) {
          docsToRemove.push(transaction.get(todaySnap.ref.collection('task').doc(todayTaskId)));
        }
      }));
    }

    await Promise.all(decryptTodaysPromise);

    // remove all documents
    for (const doc of await Promise.all(docsToRemove)) {
      transactionWrite.delete(doc.ref);
    }
    transactionWrite.delete(roundDocSnap.ref);

    // update user
    const roundsInUser: string[] = userDocSnap.data()?.rounds ? JSON.parse(await roundsInUserDecryptPromise) as string[] : [];
    const roundIndexInUser = roundsInUser.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    roundsInUser.splice(roundIndexInUser, 1);

    const userDataToWrite = {
      rounds: await encrypt(roundsInUser, cryptoKey)
    };
    writeUser(transaction, userDocSnap, userDataToWrite);

    return transactionWrite.execute();

  }).then(() => ({
    details: 'Your round has been deleted 🤭'
  }));
};
