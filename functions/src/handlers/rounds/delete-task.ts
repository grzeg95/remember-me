import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {Task} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from "../../helpers/transaction-write";
import {getUser} from '../../helpers/user';
import {
  decryptRound,
  decryptTask,
  decryptToday, encryptRound,
  encryptToday, getCryptoKey
} from '../../security/security';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

export const proceedTaskRemoving = async (context: CallableContext, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot): Promise<Transaction> => {

  const transactionWrite = new TransactionWrite(transaction);

  const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

  // interrupt if user has not this timesOfDay
  testRequirement(!roundDocSnap.exists);

  const taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

  // interrupt if user has not this task
  testRequirement(!taskDocSnap.exists);

  testRequirement(!context.auth?.token.secretKey);
  const cryptoKey = await getCryptoKey(context.auth?.token.secretKey);

  /*
  * Read all data
  * */

  const task: Task = await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey);
  const round = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
  const timesOfDay = round.timesOfDay;
  const timesOfDayCardinality = round.timesOfDayCardinality;
  const todaysIds = round.todaysIds.toSet();
  const tasksIds = round.tasksIds.toSet();

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  const todayMapDocumentsPromise: { [key in string]: Promise<DocumentSnapshot> } = {};

  for (const docId of todaysIds) {
    const docRef = roundDocSnap.ref.collection('today').doc(docId);
    todayMapDocumentsPromise[docRef.id] = transaction.get(docRef);
  }

  const todayMapDocuments: { [key in string]: DocumentSnapshot } = {};
  for (const docRefId of Object.getOwnPropertyNames(todayMapDocumentsPromise)) {
    todayMapDocuments[docRefId] = await todayMapDocumentsPromise[docRefId];
  }

  const todaySnapsToCheckToRemove: DocumentSnapshot[] = [];

  for (const id of Object.getOwnPropertyNames(todayMapDocuments)) {
    todayTaskDocSnapsToUpdatePromises.push(
      transaction.get(todayMapDocuments[id].ref.collection('task').doc(`${taskDocSnap.id}`)).then((docSnap) => {

        if (docSnap.exists) {
          todaySnapsToCheckToRemove.push(todayMapDocuments[id]);
        }

        return docSnap;
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
  for (const todayDocSnap of todaySnapsToCheckToRemove) {

    const todayTask = await decryptToday(todayDocSnap.data() as {value: string}, cryptoKey);

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

  await transactionWrite.execute();

  return transaction;
};

/**
 * Read user data about task and remove it
 * @param {any} data
 * @param {CallableContext} callableContext
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = (data: any, callableContext: CallableContext): Promise<{[key: string]: string}> => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

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

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    return proceedTaskRemoving(callableContext, data.roundId, data.taskId, transaction, userDocSnap);

  }).then(() => ({
    details: 'Your task has been deleted 🤭'
  }));
};
