import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {FunctionResult, Round, Task} from '../../helpers/models';
import {
  decryptRound,
  decryptTask,
  decryptToday,
  encryptRound,
  encryptToday,
  getCryptoKey
} from '../../helpers/security';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from '../../helpers/transaction-write';
import {getUser} from '../../helpers/user';
import DocumentSnapshot = firestore.DocumentSnapshot;
import Transaction = firestore.Transaction;

const app = firestore();

export const proceedTaskRemoving = (cryptoKey: CryptoKey, roundId: string, taskId: string, transaction: Transaction, userDocSnap: DocumentSnapshot): Promise<Transaction> => {

  const transactionWrite = new TransactionWrite(transaction);
  let roundDocSnap: firestore.DocumentSnapshot;
  let taskDocSnap: firestore.DocumentSnapshot;
  let task: Task;
  let round: Round;
  let todayTasks: firestore.DocumentSnapshot[];
  const todaySnapsToCheckToRemove: DocumentSnapshot[] = [];
  let timesOfDay: string[];
  let timesOfDayCardinality: number[];
  let todaysIds: Set<string>;
  let tasksIds: Set<string>;

  return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId)).then((_roundDocSnap) => {
    roundDocSnap = _roundDocSnap;

    // interrupt if user has not this timesOfDay
    testRequirement(!roundDocSnap.exists);

    return transaction.get(roundDocSnap.ref.collection('task').doc(taskId));
  }).then((_taskDocSnap) => {

    taskDocSnap = _taskDocSnap;

    // interrupt if user has not this task
    testRequirement(!taskDocSnap.exists);

    /*
    * Read all data
    * */

    return Promise.all([
      decryptTask(taskDocSnap.data() as {value: string}, cryptoKey),
      decryptRound(roundDocSnap.data() as {value: string}, cryptoKey)
    ]);

  }).then(([_task, _round]) => {

    task = _task;
    round = _round;

    timesOfDay = round.timesOfDay;
    timesOfDayCardinality = round.timesOfDayCardinality;
    todaysIds = round.todaysIds.toSet();
    tasksIds = round.tasksIds.toSet();

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
          })
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

    return todayTasksPromise;
  }).then((_todayTasks) => {

    todayTasks = _todayTasks;

    // check if today collection has only one task that will be removed
    // just read one field: size of tasks lol

    const todaySnapsToCheckToRemoveDecryptedPromise = [];

    for (const todayDocSnap of todaySnapsToCheckToRemove) {
      todaySnapsToCheckToRemoveDecryptedPromise.push(
        decryptToday(todayDocSnap.data() as {value: string}, cryptoKey)
      );
    }

    return Promise.all(todaySnapsToCheckToRemoveDecryptedPromise);
  }).then((todaySnapsToCheckToRemoveDecrypted) => {

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
  });
};

/**
 * Read user data about task and remove it
 * @param {any} data
 * @param {CallableContext} callableContext
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = (data: any, callableContext: CallableContext): FunctionResult => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

  // email not verified, not for anonymous
  testRequirement(
    !auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous
  );

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

  testRequirement(!callableContext.auth?.token.secretKey);

  return getCryptoKey(callableContext.auth?.token.secretKey).then((cryptoKey) => {
    return app.runTransaction((transaction) => {

      return getUser(app, transaction, auth?.uid as string).then((userDocSnap) => {
        return proceedTaskRemoving(cryptoKey, data.roundId, data.taskId, transaction, userDocSnap);
      })
    }).then(() => ({
      details: 'Your task has been deleted 🤭'
    }));
  });
};
