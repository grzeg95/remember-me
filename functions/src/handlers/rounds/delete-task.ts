import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import '../../utils/global.prototype';
import {Round, RoundDocUncrypded} from '../../models/round';
import {Task} from '../../models/task';
import {Today} from '../../models/today';
import {TodayTask} from '../../models/today-task';
import {User} from '../../models/user';
import {encryptRound, encryptToday, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const firestore = getFirestore();

export const proceedTaskRemoving = async (cryptoKey: CryptoKey, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot<User>): Promise<Transaction> => {

  const transactionWrite = new TransactionWrite(transaction);
  const todaySnapsToCheckToRemove: DocumentSnapshot<Today>[] = [];

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

  const timesOfDay = round.timesOfDay;
  const timesOfDayCardinality = round.timesOfDayCardinality;
  const todaysIds = round.todaysIds.toSet();
  const tasksIds = round.tasksIds.toSet();

  // read all task for user/{userId}/today/{day}/task/{taskId}
  const todayTaskDocSnapsToUpdatePromises = [];

  for (const docId of todaysIds) {

    const todayRef = Today.ref(roundDocSnap.ref, docId);

    todayTaskDocSnapsToUpdatePromises.push(
      transaction.get(todayRef).then((snap) => {

        const todayTaskRef = TodayTask.ref(snap.ref, taskDocSnap.id);

        return transaction.get(todayTaskRef).then((docSnap) => {

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
      Today.data(todayDocSnap, cryptoKey)
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
      } as Today, cryptoKey));
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
  } as RoundDocUncrypded, cryptoKey));

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

  return firestore.runTransaction(async (transaction) => {

    const userDocSnap = await getUserDocSnap(firestore, transaction, auth?.uid as string);
    return proceedTaskRemoving(cryptoKey, data.roundId, data.taskId, transaction, userDocSnap);

  }).then(() => ({
    details: 'Your task has been deleted 🤭'
  }));
};
