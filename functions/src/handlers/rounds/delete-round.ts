import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {
  Context,
  decrypt,
  decryptRound,
  decryptToday,
  encrypt,
  FunctionResultPromise,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite,
  writeUser
} from '../../tools';

const app = getFirestore();

export const handler = async (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const roundId = context.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!context.app || !auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);

    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);

    // get all tasks
    const docsToRemovePromise: (Promise<DocumentSnapshot> | DocumentSnapshot)[] = [];
    for (const taskId of roundDocSnapData.tasksIds) {
      docsToRemovePromise.push(transaction.get(roundDocSnap.ref.collection('task').doc(taskId)));
    }

    const allTasksListOfDayRefsPromise: Promise<DocumentSnapshot>[] = [];

    // get all today's
    for (const todayId of roundDocSnapData.todaysIds) {
      const today = roundDocSnap.ref.collection('today').doc(todayId);
      allTasksListOfDayRefsPromise.push(transaction.get(today));
    }

    transactionWrite.delete(roundDocSnap.ref);

    const allTasksListOfDayRefs = await Promise.all(allTasksListOfDayRefsPromise);

    const decryptTodaysPromise = [];

    for (const todaySnap of allTasksListOfDayRefs) {
      docsToRemovePromise.push(todaySnap);
      decryptTodaysPromise.push(decryptToday(todaySnap.data() as {
        value: string
      }, cryptoKey).then((decryptedToday) => {
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

    let roundsInUser: string[] = [];

    if (userDocSnap.data()?.rounds) {
      roundsInUser = await decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => JSON.parse(text) as string []);
    }

    // update user
    const roundIndexInUser = roundsInUser.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    roundsInUser.splice(roundIndexInUser, 1);

    writeUser(transactionWrite, userDocSnap, encrypt(roundsInUser, cryptoKey).then((encryptedRounds) => {
      return {
        rounds: encryptedRounds
      };
    }));

    return transactionWrite.execute();

  }).then(() => ({
    code: 200,
    body: {
      details: 'Your round has been deleted 🤭'
    }
  }));
};
