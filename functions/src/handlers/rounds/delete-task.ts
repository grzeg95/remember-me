import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';

import '../../utils/global.prototype';
import {Round, RoundDoc} from '../../models/round';
import {Task} from '../../models/task';
import {Today, TodayDoc} from '../../models/today';
import {TodayTask} from '../../models/today-task';
import {User, UserDoc} from '../../models/user';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const app = getFirestore();

export const proceedTaskRemoving = async (cryptoKey: CryptoKey, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot<User, UserDoc>): Promise<Transaction> => {

  const transactionWrite = new TransactionWrite(transaction);
  const todaySnapsToCheckToRemove: DocumentSnapshot<Today, TodayDoc>[] = [];

  const roundRef = Round.ref(userDocSnap.ref, roundId);
  const roundDocSnap = await transaction.get(roundRef);

  // interrupt if user has not this timesOfDay
  testRequirement(!roundDocSnap.exists);

  const taskRef = Task.ref(roundDocSnap.ref, taskId);
  const taskDocSnap = await transaction.get(taskRef);

  // interrupt if user has not this task
  testRequirement(!taskDocSnap.exists);

  /*
   * Read all data
   * */

  const [task, round] = await Promise.all([
    Task.data(taskDocSnap, cryptoKey),
    Round.data(roundDocSnap, cryptoKey)
  ]);

  const timesOfDay = round.timesOfDayIds;
  const timesOfDayIdsCardinality = round.timesOfDayIdsCardinality;
  const todayIds = round.todayIds.toSet();
  const tasksIds = round.tasksIds.toSet();

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  for (const docId of todayIds) {
    todayTaskDocSnapsToUpdatePromises.push(
      transaction.get(Today.ref(roundDocSnap.ref, docId)).then((todaySnap) => {
        return transaction.get(TodayTask.ref(todaySnap.ref, taskDocSnap.id)).then((todayTaskSnap) => {

          if (todayTaskSnap.exists) {
            todaySnapsToCheckToRemove.push(todaySnap);
          }

          return todayTaskSnap;
        });
      })
    );
  }

  const todayTasksPromise = Promise.all(todayTaskDocSnapsToUpdatePromises);

  // prepare timesOfDay and timesOfDayCardinality
  for (const timeOfDay of task.timesOfDayIds) {
    const indexToRemove = timesOfDay.indexOf(timeOfDay);
    if (indexToRemove > -1) {
      if (timesOfDayIdsCardinality[indexToRemove] - 1 === 0) {
        timesOfDayIdsCardinality.splice(indexToRemove, 1);
        timesOfDay.splice(indexToRemove, 1);
      } else {
        timesOfDayIdsCardinality[indexToRemove]--;
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
      Today.data(todayDocSnap, cryptoKey)
    );
  }

  const todaySnapsToCheckToRemoveDecrypted = await Promise.all(todaySnapsToCheckToRemoveDecryptedPromise);

  for (const [i, todayDocSnap] of todaySnapsToCheckToRemove.entries()) {

    const todayTask = todaySnapsToCheckToRemoveDecrypted[i];

    if (todayTask.todayTasksIds.length === 1) {
      transactionWrite.delete(todayDocSnap.ref);
      todayIds.delete(todayDocSnap.ref.id);
    } else {
      const todayTasksIds = todayTask.todayTasksIds.toSet();
      todayTasksIds.delete(taskDocSnap.id);

      const encryptedName = await encrypt(todayTask.name, cryptoKey);
      const todayTasksIdsName = await encrypt(todayTasksIds.toArray(), cryptoKey);

      transactionWrite.update(todayDocSnap.ref, {
        name: encryptedName,
        tasksIds: todayTasksIdsName
      });
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
  const encryptedName = await encrypt(round.name, cryptoKey);
  transactionWrite.update(roundDocSnap.ref, {
    encryptedName,
    timesOfDayIdsCardinality,
    todayIds: todayIds.toArray(),
    tasksIds: tasksIds.toArray()
  } as RoundDoc);

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
