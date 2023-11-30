import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {
  decryptRound,
  decryptTask,
  decryptToday,
  encryptRound,
  encryptToday,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite
} from '../../tools';

import '../../tools/global.prototype';

const app = getFirestore();

export const proceedTaskRemoving = async (cryptoKey: CryptoKey, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot): Promise<Transaction> => {

  const transactionWrite = new TransactionWrite(transaction);
  const todaySnapsToCheckToRemove: DocumentSnapshot[] = [];

  const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

  // interrupt if user has not this timesOfDay
  testRequirement(!roundDocSnap.exists);

  const taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

  // interrupt if user has not this task
  testRequirement(!taskDocSnap.exists);

  /*
   * Read all data
   * */

  const [task, round] = await Promise.all([
    decryptTask(taskDocSnap.data() as {value: string}, cryptoKey),
    decryptRound(roundDocSnap.data() as {value: string}, cryptoKey)
  ]);

  const timesOfDay = round.timesOfDay;
  const timesOfDayCardinality = round.timesOfDayCardinality;
  const todaysIds = round.todaysIds.toSet();
  const tasksIds = round.tasksIds.toSet();

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  for (const docId of todaysIds) {
    todayTaskDocSnapsToUpdatePromises.push(
      transaction.get(roundDocSnap.ref.collection('today').doc(docId)).then((snap) => {
        return transaction.get(snap.ref.collection('task').doc(`${taskDocSnap.id}`)).then((docSnap) => {

          if (docSnap.exists) {
            todaySnapsToCheckToRemove.push(snap);
          }

          return docSnap;
        });
      })
    );
  }

  const todayTasksPromise = Promise.all(todayTaskDocSnapsToUpdatePromises);

  // prepare timesOfDay and timesOfDayCardinality
  for (const timeOfDay of task.timesOfDay) {
    const indexToRemove = timesOfDay.indexOf(timeOfDay);
    if (indexToRemove > -1) {
      if (timesOfDayCardinality[indexToRemove] - 1 === 0) {
        timesOfDayCardinality.splice(indexToRemove, 1);
        timesOfDay.splice(indexToRemove, 1);
      } else {
        timesOfDayCardinality[indexToRemove]--;
      }
    }
  }

  // wait for rest

  const todayTasks = await todayTasksPromise;

  // check if today collection has only one task that will be removed
  // just read one field: size of tasks lol

  const todaySnapsToCheckToRemoveDecryptedPromise = [];

  for (const todayDocSnap of todaySnapsToCheckToRemove) {
    todaySnapsToCheckToRemoveDecryptedPromise.push(
      decryptToday(todayDocSnap.data() as {value: string}, cryptoKey)
    );
  }

  const todaySnapsToCheckToRemoveDecrypted = await Promise.all(todaySnapsToCheckToRemoveDecryptedPromise);

  for (const [i, todayDocSnap] of todaySnapsToCheckToRemove.entries()) {

    const todayTask = todaySnapsToCheckToRemoveDecrypted[i];

    if (todayTask.tasksIds.length === 1) {
      transactionWrite.delete(todayDocSnap.ref);
      todaysIds.delete(todayDocSnap.ref.id);
    } else {
      const todayTasksIds = todayTask.tasksIds.toSet();
      todayTasksIds.delete(taskDocSnap.id);

      transactionWrite.update(todayDocSnap.ref, encryptToday({
        name: todayTask.name,
        tasksIds: todayTasksIds.toArray()
      }, cryptoKey));
    }
  }

  /*
   * Proceed all data
   * */

  // remove task
  transactionWrite.delete(taskDocSnap.ref);
  tasksIds.delete(taskDocSnap.id);

  // remove todayTasks
  for (const todayTaskDocSnap of todayTasks) {
    transactionWrite.delete(todayTaskDocSnap.ref);
  }

  // roundDataToWrite
  transactionWrite.update(roundDocSnap.ref, encryptRound({
    timesOfDayCardinality,
    timesOfDay,
    name: round.name,
    todaysIds: todaysIds.toArray(),
    tasksIds: tasksIds.toArray()
  }, cryptoKey));

  return transactionWrite.execute();
};

/**
 * Read user data about task and remove it
 * @param {CallableRequest} request
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 3 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'roundId', 'taskId'
  testRequirement(!dataKeys.toSet().hasOnly(['taskId', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.taskId is not empty string
  testRequirement(typeof data.taskId !== 'string' || data.taskId.length === 0);

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    return proceedTaskRemoving(cryptoKey, data.roundId, data.taskId, transaction, userDocSnap);

  }).then(() => ({
    code: 200,
    body: {
      details: 'Your task has been deleted 🤭'
    }
  }));
};
