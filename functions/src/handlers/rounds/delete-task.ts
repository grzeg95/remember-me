import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {Task} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';
import {decrypt} from '../../security/decrypt';
import {decryptPrivateKey} from '../../security/decrypt-private-key';
import {decryptRound} from '../../security/decrypt-round';
import {encrypt} from '../../security/encrypt';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

export const proceedTaskRemoving = async (context: CallableContext, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot): Promise<Transaction> => {

  const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

  // interrupt if user has not this timesOfDay
  testRequirement(!roundDocSnap.exists);

  const taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

  // interrupt if user has not this task
  testRequirement(!taskDocSnap.exists);

  // get private key
  const privateKey = await decryptPrivateKey(context.auth?.token.privateKey);
  testRequirement(typeof privateKey !== 'string' || privateKey.length === 0);

  /*
  * Read all data
  * */

  const task: Task = taskDocSnap.data() as Task;
  const timesOfDayDocSnapData = decryptRound(roundDocSnap.data(), privateKey);
  const currentTaskSize = timesOfDayDocSnapData.taskSize;
  const timesOfDay: string[] = timesOfDayDocSnapData.timesOfDay;
  const timesOfDayCardinality: number[] = timesOfDayDocSnapData.timesOfDayCardinality;

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  const docRefsMap: {[key in string]: DocumentSnapshot} = {};
  roundDocSnap.ref.collection('today').listDocuments().then(async (docRefs) => {
    for (const docRef of docRefs) {
      docRefsMap[decrypt(docRef.id, privateKey)] = (await transaction.get(docRef));
    }
  });

  for (const day of task.daysOfTheWeek) {
    todayTaskDocSnapsToUpdatePromises.push(
      transaction.get(docRefsMap[day].ref.collection('task').doc(`${taskDocSnap.id}`))
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

  /*
  * Proceed all data
  * */

  // remove task
  transaction.delete(taskDocSnap.ref);

  // remove todayTasks
  for (const todayTaskDocSnap of todayTasks) {
    transaction.delete(todayTaskDocSnap.ref);
  }

  const roundDataToWrite: any = {
    timesOfDayCardinality: encrypt(timesOfDayCardinality, privateKey),
    taskSize: encrypt(currentTaskSize - 1, privateKey),
    timesOfDay: encrypt(timesOfDay, privateKey)
  };

  transaction.update(roundDocSnap.ref, roundDataToWrite);

  return transaction;

};

/**
 * Read user data about task and remove it
 * @param data {
 *     roundId: string
 *     taskId: string
 * }
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{ [key: string]: string }> => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

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

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    return proceedTaskRemoving(context, data.roundId, data.taskId, transaction, userDocSnap);

  }).then(() => ({
    details: 'Your task has been deleted 🤭'
  }));
};
