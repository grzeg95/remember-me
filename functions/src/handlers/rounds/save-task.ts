// tslint:disable-next-line:no-import-side-effect
import '../../../../global.prototype';
import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import {getUser} from '../../helpers/user';
import {
  decryptRound,
  decryptTask, decryptToday, decryptTodayTask, encrypt, encryptRound,
  encryptTask, encryptToday,
  encryptTodayTask, getCryptoKey
} from '../../security/security';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from '../../helpers/models';
import {
  transactionWriteAdd,
  transactionWriteExecute,
  TransactionWriteList
} from '../../helpers/transaction-write';

const app = firestore();

/**
 * @interface TaskDiff
 **/
interface TaskDiff {
  description: boolean,
  timesOfDay: boolean,
  daysOfTheWeek: boolean
}

/**
 * @function getTaskChange
 * @param {Task} a
 * @param {Task} b
 * @return {TaskDiff}
 **/
const getTaskChange = (a: Task, b: Task): TaskDiff => {
  const aTimesOfDay = a.timesOfDay.toSet();
  const bTimesOfDay = b.timesOfDay.toSet();
  return {
    description: a.description !== b.description,
    timesOfDay: !aTimesOfDay.hasOnly(bTimesOfDay),
    daysOfTheWeek: !a.daysOfTheWeek.toSet().hasOnly(b.daysOfTheWeek.toSet())
  };
};

/**
 * Update times of day
 * @function prepareTimesOfDay
 * @param {Transaction} transaction
 * @param {string[]} taskCurrentTimesOfDay
 * @param {string[]} enteredTimesOfDay
 * @param {string[]} timesOfDay
 * @param {number[]} timesOfDayCardinality
 * @return {{addedTimesOfDay: Set<string>, removedTimesOfDay: Set<string>}}
 **/
export const prepareTimesOfDay = (
  transaction: Transaction,
  taskCurrentTimesOfDay: string[],
  enteredTimesOfDay: string[],
  timesOfDay: string[],
  timesOfDayCardinality: number[]): {timesOfDay: string[], timesOfDayCardinality: number[]} => {

  const toAdd = enteredTimesOfDay.toSet().difference(taskCurrentTimesOfDay.toSet());
  const toRemove = taskCurrentTimesOfDay.toSet().difference(enteredTimesOfDay.toSet());

  for (const timeOfDay of toRemove) {
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

  for (const timeOfDay of toAdd) {
    const indexToAdd = timesOfDay.indexOf(timeOfDay);
    if (indexToAdd > -1) {
      timesOfDayCardinality[indexToAdd]++;
    } else {
      timesOfDayCardinality.unshift(1);
      timesOfDay.unshift(timeOfDay);
    }
  }

  testRequirement(timesOfDay.length > 10, `You can own 10 times of day but merge has ${timesOfDay.length} 🤔`);

  return {
    timesOfDay,
    timesOfDayCardinality
  };
};

export const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, taskDocSnapData: Task, roundDocSnap: DocumentSnapshot, roundDocSnapData: Round, transactionWriteList: TransactionWriteList, cryptoKey: CryptoKey) => {

  // create task for days
  // add task timesOfDay
  const timesOfDay: { [key in string]: boolean } = {};

  for (const timeOfDay of task.timesOfDay) {
    timesOfDay[timeOfDay] = false;
  }

  const encryptedTodayTaskToAddPromise = encryptTodayTask({
    description: task.description,
    timesOfDay
  }, cryptoKey);

  const todaysIds: Set<string> = new Set(roundDocSnapData.todaysIds);

  // get all days from round
  const todayDocRefsMap: {
    [key in string]: {
      docSnap: DocumentSnapshot,
      today: Today
    }
  } = {};

  const docsSnapsPromises: Promise<DocumentSnapshot>[] = [];

  for (const todayId of todaysIds.toArray()) {
    docsSnapsPromises.push(transaction.get(roundDocSnap.ref.collection('today').doc(todayId)));
  }

  const docsSnaps = await Promise.all(docsSnapsPromises);

  const decryptedTodayPromise: Promise<Today>[] = [];

  for (const docSnap of docsSnaps) {
    decryptedTodayPromise.push(decryptToday(docSnap.data() as {value: string}, cryptoKey));
  }

  const decryptedToday = await Promise.all(decryptedTodayPromise);
  for (const [i, docSnap] of docsSnaps.entries()) {
    todayDocRefsMap[decryptedToday[i].name] = {
      docSnap,
      today: decryptedToday[i]
    };
  }

  // get all days task from existed task
  const todayTaskDocSnapsDayPackPromise = [];

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(todayDocRefsMap[day].docSnap.ref.collection(`task`).doc(`${taskDocSnap.id}`))
        .then((docSnap) => ({day, docSnap})));
  }

  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);
  const todayTaskDocSnapsMap: {
    [key in string]: {
      docSnap: DocumentSnapshot,
      todayTask: TodayTask
    }
  } = {};
  const decryptedTodayTaskDocSnapsPromise = [];

  for (const docSnapPack of todayTaskDocSnapsDayPack) {
    decryptedTodayTaskDocSnapsPromise.push(decryptTodayTask(docSnapPack.docSnap.data() as EncryptedTodayTask, cryptoKey));
  }

  const decryptedTodayTaskDocSnaps = await Promise.all(decryptedTodayTaskDocSnapsPromise);
  for (const [i, docSnapPack] of (todayTaskDocSnapsDayPack).entries()) {
    todayTaskDocSnapsMap[docSnapPack.day] = {
      docSnap: docSnapPack.docSnap,
      todayTask: decryptedTodayTaskDocSnaps[i]
    };
  }

  const toUpdate: Set<string> = new Set();
  const toRemove: Set<string> = new Set();
  const toCreate: Set<string> = new Set();
  const taskDocSnapDaysOfTheWeek = (taskDocSnapData.daysOfTheWeek || []).toSet();
  const taskDaysOfTheWeek = (task.daysOfTheWeek || []).toSet();

  for (const day of task.daysOfTheWeek || []) {
    if (taskDocSnapDaysOfTheWeek.has(day)) {
      toUpdate.add(day);
    } else {
      toCreate.add(day);
    }
  }

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    if (taskDaysOfTheWeek.has(day)) {
      toUpdate.add(day);
    } else {
      toRemove.add(day);
    }
  }

  // get all days from new task
  // create if not exists
  const newTodayItemsForTaskToCreatePromises: Promise<{dayToCreate: string; docSnap: DocumentSnapshot}>[] = [];
  for (const dayToCreate of toCreate) {
    if (!todayDocRefsMap[dayToCreate]) {
      newTodayItemsForTaskToCreatePromises.push(
        transaction.get(roundDocSnap.ref.collection(`today`).doc()).then((docSnap) => {
          return {dayToCreate, docSnap};
        }));
    }
  }

  const newTodayItemsForTaskToCreate = await Promise.all(newTodayItemsForTaskToCreatePromises);
  const newTodayItemsMap: { [key in string]: DocumentSnapshot } = {};

  for (const item of newTodayItemsForTaskToCreate) {
    newTodayItemsMap[item.dayToCreate] = item.docSnap;
    todaysIds.add(item.docSnap.id);
  }

  // get new today tasks
  // on exist today's
  // on new today's
  for (const dayToCreate of toCreate) {

    if (!todayDocRefsMap[dayToCreate]) {
      transactionWriteAdd(
        transaction,
        transactionWriteList,
        newTodayItemsMap[dayToCreate].ref.collection(`task`).doc(taskDocSnap.id),
        'create',
        encryptedTodayTaskToAddPromise
      );
    } else {
      transactionWriteAdd(
        transaction,
        transactionWriteList,
        todayDocRefsMap[dayToCreate].docSnap.ref.collection(`task`).doc(taskDocSnap.id),
        'create',
        encryptedTodayTaskToAddPromise
      );
    }
  }

  // prepare
  // create day if not exists
  for (const dayToCreate of newTodayItemsForTaskToCreate) {
    transactionWriteAdd(transaction, transactionWriteList, dayToCreate.docSnap.ref, 'create', encryptToday({
      name: dayToCreate.dayToCreate,
      tasksIds: [taskDocSnap.id]
    }, cryptoKey));
  }

  // increment taskSize if new task is in today
  for (const dayToCreate of toCreate) {
    if (todayDocRefsMap[dayToCreate]) {
      const todayTask = todayDocRefsMap[dayToCreate].today;

      transactionWriteAdd(transaction, transactionWriteList, todayDocRefsMap[dayToCreate].docSnap.ref, 'update', encryptToday({
        name: todayTask.name,
        tasksIds: [...todayTask.tasksIds, taskDocSnap.id]
      }, cryptoKey));
    }
  }

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    if (!taskDaysOfTheWeek.has(day)) {
      const todayTaskIds = todayDocRefsMap[day].today.tasksIds;
      if (todayTaskIds.length === 1) {
        transactionWriteAdd(transaction, transactionWriteList, todayDocRefsMap[day].docSnap.ref, 'delete');
        todaysIds.delete(todayDocRefsMap[day].docSnap.ref.id);
      }
    }
  }

  for (const taskFromDayToRemove of toRemove) {
    transactionWriteAdd(
      transaction,
      transactionWriteList,
      todayDocRefsMap[taskFromDayToRemove].docSnap.ref.collection(`task`).doc(taskDocSnap.id),
      'delete'
    );
  }

  // update
  // add task timesOfDay to newTimesOfDay
  const newTimesOfDayRaw: { [key in string]: boolean } = {};

  // select inserted task timesOfDay to newTimesOfDayRaw
  for (const timeOfDay of task.timesOfDay) {
    newTimesOfDayRaw[timeOfDay] = false;
  }

  for (const dayToUpdate of toUpdate) {

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    const oldTimesOfDay: { [key in string]: boolean } = {};

    const todayTask = todayTaskDocSnapsMap[dayToUpdate].todayTask;
    for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
      oldTimesOfDay[timeOfDay] = todayTask.timesOfDay[timeOfDay];
    }

    // maybe there exist selected timesOfDay
    const newTimesOfDay = {...newTimesOfDayRaw};
    for (const newTimeOfDay of Object.keys(newTimesOfDay)) {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    }

    transactionWriteAdd(transaction, transactionWriteList, todayTaskDocSnapsMap[dayToUpdate].docSnap.ref, 'set', encryptTodayTask({
      description: task.description,
      timesOfDay: newTimesOfDay
    }, cryptoKey));
  }

  return todaysIds.toArray();
};

const updateRound = (transaction: Transaction, transactionWriteList: TransactionWriteList, userDocSnap: DocumentSnapshot, roundId: string, round: Round, cryptoKey: CryptoKey): void => {
  transactionWriteAdd(
    transaction,
    transactionWriteList,
    userDocSnap.ref.collection('rounds').doc(roundId),
    'update',
    encryptRound(round, cryptoKey)
  );
}

/**
 * Save task
 * @function handler
 * @param {*} data
 * {
 *  task: {
 *   timesOfDay: string[],
 *   daysOfTheWeek: not null like ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
 *   description: string
 *  },
 *  taskId: string,
 *  roundId: string
 * }
 * @param {CallableContext} callableContext
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 **/
export const handler = async (data: any, callableContext: CallableContext): Promise<{created: boolean; details: string; taskId: string}> => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 3 keys
  testRequirement(dataKeys.length !== 3);

  // data has not 'task', 'taskId', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['task', 'taskId', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.taskId is not empty string
  testRequirement(typeof data.taskId !== 'string' || data.taskId.length === 0);

  // data task is not an object or is null
  testRequirement(typeof data.task !== 'object' || data.task === null);

  const dataTaskKeys = Object.keys(data.task);

  // data.task has not 3 keys
  testRequirement(dataTaskKeys.length !== 3);

  // data.task has not ['description', 'daysOfTheWeek', 'timesOfDay']
  testRequirement(!dataTaskKeys.toSet().hasAny(['description', 'daysOfTheWeek', 'timesOfDay'].toSet()));

  // data.task.description is not a string
  testRequirement(typeof data.task.description !== 'string');

  data.task.description = data.task.description.trim();

  // data.task.description is not a string in [1, 256]
  testRequirement(data.task.description.length < 1 || data.task.description.length > 256);

  // data.task.daysOfTheWeek is not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  testRequirement(
    !Array.isArray(data.task.daysOfTheWeek) ||
    data.task.daysOfTheWeek.length === 0 ||
    data.task.daysOfTheWeek.length > 7 ||
    !((new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).hasAll(new Set(data.task.daysOfTheWeek)))
  );

  // data.task.timesOfDay is not an array
  testRequirement(!Array.isArray(data.task.timesOfDay));

  // data.task.timesOfDay.length is not in [1, 10]
  testRequirement(data.task.timesOfDay.length === 0 || data.task.timesOfDay.length > 10);

  const timesOfDayTmp = [];
  for (const timeOfDay of data.task.timesOfDay) {
    // data.task.timesOfDay contains other than string
    testRequirement(typeof timeOfDay !== 'string');

    const timeOfDayTrim = (timeOfDay as string).trim();

    // data.task.timesOfDay contains string that trim is not in [1, 100]
    testRequirement(timeOfDayTrim.length === 0 || timeOfDayTrim.length > 100);

    timesOfDayTmp.push(timeOfDayTrim);
  }
  data.task.timesOfDay = timesOfDayTmp;

  // data.task.timesOfDay contains duplicates
  testRequirement(data.task.timesOfDay.toSet().size !== data.task.timesOfDay.length);

  let created = false;
  let taskId: string = data.taskId;
  const roundId: string = data.roundId;
  const transactionWriteList: TransactionWriteList = {
    value: []
  };

  testRequirement(!auth?.token.secretKey);
  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // roundSnap must exist
    testRequirement(!roundDocSnap.exists);

    const taskDocSnapTmp = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

    const task = data.task as Task;
    task.description = task.description.trim();

    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
    const timesOfDay = roundDocSnapData.timesOfDay;
    const timesOfDayCardinality = roundDocSnapData.timesOfDayCardinality;
    const tasksIds = roundDocSnapData.tasksIds.toSet();

    /*
    * Read all data
    * */

    // read task or create it
    let taskDocSnap: DocumentSnapshot;
    if (!taskDocSnapTmp.exists) {
      testRequirement(roundDocSnapData.todaysIds.length + 1 > 25, `You can own up tp 25 tasks but merge has ${roundDocSnapData.todaysIds.length + 1} 🤔`);
      created = true;
      taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc());
      taskId = taskDocSnap.id;
      tasksIds.add(taskId);
    } else {
      taskDocSnap = taskDocSnapTmp;
      const taskDocSnapData = await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey);

      /*
      * Check if nothing changed or only description was changed
      * */
      const taskChange = getTaskChange(taskDocSnapData, task);

      /*
      * Check if nothing was changed
      * */
      testRequirement(!taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDay);

      /*
      * Only description was changed
      * */
      if (taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTaskDocSnapsToUpdatePromises = [];
        const docRefsMap: { [key in string]: DocumentSnapshot } = {};
        for (const todayId of roundDocSnapData.todaysIds) {
          const docSnap = await transaction.get(roundDocSnap.ref.collection('today').doc(todayId));
          const todayTask = await decryptToday(docSnap.data() as {value: string}, cryptoKey);
          docRefsMap[todayTask.name] = docSnap;
        }

        for (const day of task.daysOfTheWeek) {
          todayTaskDocSnapsToUpdatePromises.push(
            transaction.get(docRefsMap[day].ref.collection('task').doc(`${taskDocSnap.id}`))
          );
        }

        const todayTaskDocSnapsToUpdate = await Promise.all(todayTaskDocSnapsToUpdatePromises);
        /*
        * Proceed all data
        * */

        for (const todayTask of todayTaskDocSnapsToUpdate) {
          testRequirement(!todayTask.exists, `Known task ${taskDocSnap.ref.path} is not related with ${todayTask.ref.path}`);

          transactionWriteAdd(transaction, transactionWriteList, todayTask.ref, 'update', new Promise(async (resolve) => {
            resolve({
              description: await encrypt(task.description, cryptoKey)
            });
          }));
        }

        transactionWriteAdd(transaction, transactionWriteList, taskDocSnap.ref, 'update', encryptTask({
          description: task.description,
          timesOfDay: task.timesOfDay,
          daysOfTheWeek: task.daysOfTheWeek
        }, cryptoKey));

        await transactionWriteExecute(transactionWriteList);
        return transaction;
      }

      /*
      * Only daysOfTheWeek was changed
      * */
      if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

        transactionWriteAdd(transaction, transactionWriteList, taskDocSnap.ref, 'set', encryptTask(task, cryptoKey));

        // update round
        updateRound(
          transaction,
          transactionWriteList,
          userDocSnap,
          roundId,
          {
            timesOfDay: roundDocSnapData.timesOfDay,
            timesOfDayCardinality: roundDocSnapData.timesOfDayCardinality,
            name: roundDocSnapData.name,
            todaysIds: await proceedTodayTasks(transaction, task, taskDocSnap, taskDocSnapData, roundDocSnap, roundDocSnapData, transactionWriteList, cryptoKey),
            tasksIds: tasksIds.toArray()
          },
          cryptoKey
        );

        await transactionWriteExecute(transactionWriteList);

        return transaction;
      }
    }

    const decryptedTask = await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey);
    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, decryptedTask.timesOfDay, data.task.timesOfDay, timesOfDay, timesOfDayCardinality);

    // update task
    transactionWriteAdd(transaction, transactionWriteList, taskDocSnap.ref, 'set', encryptTask(task, cryptoKey));

    // update round
    updateRound(
      transaction,
      transactionWriteList,
      userDocSnap,
      roundId,
      {
        timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
        timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
        name: roundDocSnapData.name,
        todaysIds: await proceedTodayTasks(transaction, task, taskDocSnap, decryptedTask, roundDocSnap, roundDocSnapData, transactionWriteList, cryptoKey),
        tasksIds: tasksIds.toArray()
      },
      cryptoKey
    );

    // delete taskDocSnapTmp if created
    if (created) {
      transactionWriteAdd(transaction, transactionWriteList, taskDocSnapTmp.ref, 'delete');
    }

    await transactionWriteExecute(transactionWriteList);
    return transaction;

  }).then(() =>
    created ? ({
      'created': true,
      'details': 'Your task has been created 😉',
      'taskId': taskId
    }) : ({
      'created': false,
      'details': 'Your task has been updated 🙃',
      'taskId': taskId
    })
  );
};
