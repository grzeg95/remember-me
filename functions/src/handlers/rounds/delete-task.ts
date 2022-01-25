import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {EncryptedRound, EncryptedTask, EncryptedToday, Task} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';
import {
  decryptRound, decryptRsaKey,
  decryptTask,
  decryptToday,
  encryptRound,
  encryptToday, RsaKey
} from '../../security/security';
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

  // get rsa key
  // TODO
  let rsaKey: RsaKey;
  if (context.auth?.token.decryptedRsaKey) {
    rsaKey = context.auth?.token.decryptedRsaKey;
  } else {
    rsaKey = await decryptRsaKey(context.auth?.token.encryptedRsaKey);
  }

  /*
  * Read all data
  * */

  const task: Task = decryptTask(taskDocSnap.data() as EncryptedTask, rsaKey);
  const timesOfDayDocSnapData = decryptRound(roundDocSnap.data() as EncryptedRound, rsaKey);
  const currentTaskSize = timesOfDayDocSnapData.taskSize;
  const timesOfDay = timesOfDayDocSnapData.timesOfDay;
  const timesOfDayCardinality = timesOfDayDocSnapData.timesOfDayCardinality;
  const name = timesOfDayDocSnapData.name;

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  const todayMapDocuments: {[key in string]: DocumentSnapshot} = {};
  await roundDocSnap.ref.collection('today').listDocuments().then(async (docRefs) => {
    for (const docRef of docRefs) {
      todayMapDocuments[docRef.id] = (await transaction.get(docRef));
    }
  });

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

    const today = decryptToday(todayDocSnap.data() as EncryptedToday, rsaKey);

    if (today.taskSize === 1) {
      transaction.delete(todayDocSnap.ref);
    } else {
      transaction.update(todayDocSnap.ref, encryptToday({
        name: today.name,
        taskSize: today.taskSize - 1
      }, rsaKey));
    }
  }

  /*
  * Proceed all data
  * */

  // remove task
  transaction.delete(taskDocSnap.ref);

  // remove todayTasks
  for (const todayTaskDocSnap of todayTasks) {
    transaction.delete(todayTaskDocSnap.ref);
  }

  const roundDataToWrite = encryptRound({
    timesOfDayCardinality,
    taskSize: currentTaskSize - 1,
    timesOfDay,
    name
  }, rsaKey);

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
