import {firestore} from 'firebase-admin';
import {CallableRequest} from 'firebase-functions/lib/common/providers/https';
import {Round} from '../../../helpers/models';
import {testRequirement} from '../../../helpers/test-requirement';
import {TransactionWrite} from '../../../helpers/transaction-write';
import {getUser, writeUser} from '../../../helpers/user';
import {
  decrypt,
  decryptRound,
  decryptToday,
  encrypt,
  getCryptoKey
} from '../../../helpers/security';
import DocumentSnapshot = firestore.DocumentSnapshot;
import DocumentData = firestore.DocumentData;

const app = firestore();

export const handler = (request: CallableRequest): Promise<{[key: string]: string}> => {

  const auth = request.auth;
  const roundId = request.data;

  // without app check
  testRequirement(!request.app);

  // not logged in
  testRequirement(!auth);

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  testRequirement(!auth?.token.secretKey);

  let userDocSnap: firestore.DocumentSnapshot;
  let roundDocSnap: firestore.DocumentSnapshot;
  let roundDocSnapData: Round;
  let allTasksListOfDayRefs: firestore.DocumentSnapshot[];
  const docsToRemovePromise: (Promise<DocumentSnapshot<DocumentData>> | DocumentSnapshot)[] = [];
  let docsToRemove: DocumentSnapshot[] = [];

  return getCryptoKey(auth?.token.secretKey).then((cryptoKey) => {
    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);

      return getUser(app, transaction, auth?.uid as string).then((_userDocSnap) => {
        userDocSnap = _userDocSnap;

        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
      }).then((_roundDocSnap) => {
        roundDocSnap = _roundDocSnap;

        return decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
      }).then((_roundDocSnapData) => {
        roundDocSnapData = _roundDocSnapData;


        // check if round exists
        testRequirement(!roundDocSnap.exists);

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

        return Promise.all(allTasksListOfDayRefsPromise);
      }).then((_allTasksListOfDayRefs) => {

        allTasksListOfDayRefs = _allTasksListOfDayRefs;

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
      }).then((_docsToRemove) => {

        docsToRemove = _docsToRemove;

        // remove all documents
        for (const doc of docsToRemove) {
          transactionWrite.delete(doc.ref);
        }
        transactionWrite.delete(roundDocSnap.ref);

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
        details: 'Your round has been deleted 🤭'
      }));
    })
  });

};
