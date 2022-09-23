import {firestore} from 'firebase-admin';
import {Context} from '../../helpers/https-tools';
import {FunctionResultPromise} from '../../helpers/models';
import {decrypt, decryptRound, decryptToday, encrypt, getCryptoKey} from '../../helpers/security';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from '../../helpers/transaction-write';
import {getUserDocSnap, writeUser} from '../../helpers/user';
import DocumentData = firestore.DocumentData;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

export const handler = (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const roundId = context.data;

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  testRequirement(!auth?.token.secretKey);

  let userDocSnap: firestore.DocumentSnapshot;
  let roundDocSnap: firestore.DocumentSnapshot;
  const docsToRemovePromise: (Promise<DocumentSnapshot<DocumentData>> | DocumentSnapshot)[] = [];

  return getCryptoKey(auth?.token.secretKey).then((cryptoKey) => {
    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);

      return getUserDocSnap(app, transaction, auth?.uid as string).then((_userDocSnap) => {
        userDocSnap = _userDocSnap;

        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
      }).then((_roundDocSnap) => {
        roundDocSnap = _roundDocSnap;

        // check if round exists
        testRequirement(!roundDocSnap.exists);

        return decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
      }).then((roundDocSnapData) => {
        // get all documents

        // get all tasks
        for (const taskId of roundDocSnapData.tasksIds) {
          docsToRemovePromise.push(transaction.get(roundDocSnap.ref.collection('task').doc(taskId)));
        }

        const allTasksListOfDayRefsPromise: Promise<DocumentSnapshot<DocumentData>>[] = [];

        // get all today's
        for (const todayId of roundDocSnapData.todaysIds) {
          const today = roundDocSnap.ref.collection('today').doc(todayId);
          allTasksListOfDayRefsPromise.push(transaction.get(today));
        }

        transactionWrite.delete(roundDocSnap.ref);

        return Promise.all(allTasksListOfDayRefsPromise);
      }).then((allTasksListOfDayRefs) => {

        const decryptTodaysPromise = [];

        for (const todaySnap of allTasksListOfDayRefs) {
          docsToRemovePromise.push(todaySnap);
          decryptTodaysPromise.push(decryptToday(todaySnap.data() as {value: string}, cryptoKey).then((decryptedToday) => {
            for (const todayTaskId of decryptedToday.tasksIds) {
              docsToRemovePromise.push(transaction.get(todaySnap.ref.collection('task').doc(todayTaskId)));
            }
          }));
        }

        return Promise.all(decryptTodaysPromise).then(() => Promise.all(docsToRemovePromise));
      }).then((docsToRemove) => {

        // remove all documents
        for (const doc of docsToRemove) {
          transactionWrite.delete(doc.ref);
        }

        if (userDocSnap.data()?.rounds) {
          return decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => JSON.parse(text) as string []);
        }

        return [] as string[];
      }).then((roundsInUser) => {

        // update user
        const roundIndexInUser = roundsInUser.indexOf(roundId);

        testRequirement(roundIndexInUser === -1);
        roundsInUser.splice(roundIndexInUser, 1);

        writeUser(transactionWrite, userDocSnap, encrypt(roundsInUser, cryptoKey).then((encryptedRounds) => {
          return {
            rounds: encryptedRounds
          }
        }));

        return transactionWrite.execute();

      }).then(() => ({
        code: 200,
        body: {
          details: 'Your round has been deleted 🤭'
        }
      }));
    })
  });
};
