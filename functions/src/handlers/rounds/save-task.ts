// tslint:disable-next-line:no-import-side-effect
import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from '../../models';
import {
  BasicEncryptedValue,
  decryptRound,
  decryptTask,
  decryptToday,
  decryptTodayTask,
  encrypt,
  encryptRound,
  encryptTask,
  encryptToday,
  encryptTodayTask,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite
} from '../../tools';

import '../../tools/global.prototype';

const app = getFirestore();

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
 * @param {FirebaseFirestore.Transaction} transaction
 * @param {Array<string>} taskCurrentTimesOfDay
 * @param {Array<string>} enteredTimesOfDay
 * @param {Array<string>} timesOfDay
 * @param {Array<string>} timesOfDayCardinality
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

  testRequirement(timesOfDay.length > 10, {message: `You can own 10 times of day but merge has ${timesOfDay.length} 🤔`});

  return {
    timesOfDay,
    timesOfDayCardinality
  };
};

export const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, taskDocSnapData: Task, roundDocSnap: DocumentSnapshot, roundDocSnapData: Round, transactionWrite: TransactionWrite, cryptoKey: CryptoKey) => {

  // create task for days
  // add task timesOfDay
  const timesOfDay: { [key in string]: boolean } = {};

  for (const timeOfDay of task.timesOfDay) {
    timesOfDay[timeOfDay] = false;
  }

  const encryptedTodayTaskToAddPromise = encryptTodayTask({
    description: task.description,
    timesOfDay
  } as TodayTask, cryptoKey);

  const todaysIds = roundDocSnapData.todaysIds.toSet();

  // get all days from round
  const todayDocRefsMap: {
    [key in string]: {
      docSnap: DocumentSnapshot,
      today: Today
    }
  } = {};

  const docsSnapsPromises: Promise<DocumentSnapshot>[] = [];

  const todayTaskDocSnapsMap: {
    [key in string]: {
      docSnap: DocumentSnapshot,
      todayTask: TodayTask
    }
  } = {};

  const toUpdate: Set<string> = new Set();
  const toRemove: Set<string> = new Set();
  const toCreate: Set<string> = new Set();
  const taskDaysOfTheWeek = (task.daysOfTheWeek || []).toSet();

  for (const todayId of todaysIds.toArray()) {
    docsSnapsPromises.push(transaction.get(roundDocSnap.ref.collection('today').doc(todayId)));
  }

  const docsSnaps = await Promise.all(docsSnapsPromises);

  const decryptedTodayPromise = [];

  for (const docSnap of docsSnaps) {
    decryptedTodayPromise.push(
      decryptToday(docSnap.data() as {value: string}, cryptoKey)
    );
  }

  const decryptedToday = await Promise.all(decryptedTodayPromise);

  for (const [i, docSnap] of docsSnaps.entries()) {
    todayDocRefsMap[decryptedToday[i].name] = {
      docSnap,
      today: decryptedToday[i]
    };
  }

  const todayTaskDocSnapsDayPackPromise = [];
  for (const day of (taskDocSnapData.daysOfTheWeek || [])) {
    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(todayDocRefsMap[day].docSnap.ref.collection('task').doc(`${taskDocSnap.id}`))
        .then((docSnap) => ({day, docSnap}))
    );
  }

  // get all days task from existed task
  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);

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

  const taskDocSnapDaysOfTheWeek = (taskDocSnapData.daysOfTheWeek || []).toSet();

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
        transaction.get(roundDocSnap.ref.collection('today').doc()).then((docSnap) => {
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
      transactionWrite.create(
        newTodayItemsMap[dayToCreate].ref.collection('task').doc(taskDocSnap.id),
        encryptedTodayTaskToAddPromise
      );
    } else {
      transactionWrite.create(
        todayDocRefsMap[dayToCreate].docSnap.ref.collection('task').doc(taskDocSnap.id),
        encryptedTodayTaskToAddPromise
      );
    }
  }

  // prepare
  // create day if not exists
  for (const dayToCreate of newTodayItemsForTaskToCreate) {
    transactionWrite.create(dayToCreate.docSnap.ref, encryptToday({
      name: dayToCreate.dayToCreate,
      tasksIds: [taskDocSnap.id]
    }, cryptoKey));
  }

  // increment taskSize if new task is in today
  for (const dayToCreate of toCreate) {
    if (todayDocRefsMap[dayToCreate]) {
      const todayTask = todayDocRefsMap[dayToCreate].today;

      transactionWrite.update(todayDocRefsMap[dayToCreate].docSnap.ref, encryptToday({
        name: todayTask.name,
        tasksIds: [...todayTask.tasksIds, taskDocSnap.id]
      }, cryptoKey));
    }
  }

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    if (!taskDaysOfTheWeek.has(day)) {
      const todayTaskIds = todayDocRefsMap[day].today.tasksIds;
      if (todayTaskIds.length === 1) {
        transactionWrite.delete(todayDocRefsMap[day].docSnap.ref);
        todaysIds.delete(todayDocRefsMap[day].docSnap.ref.id);
      }
    }
  }

  // get tasks from day to remove
  const tasksFromTodayToRemovePromise = [];

  for (const taskFromDayToRemove of toRemove) {
    tasksFromTodayToRemovePromise.push(transaction.get(
      todayDocRefsMap[taskFromDayToRemove].docSnap.ref.collection('task').doc(taskDocSnap.id)
    ));
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

    transactionWrite.set(todayTaskDocSnapsMap[dayToUpdate].docSnap.ref, encryptTodayTask({
      description: task.description,
      timesOfDay: newTimesOfDay
    } as TodayTask, cryptoKey));
  }

  // remove tasks from day to remove
  const tasksFromDayToRemove = await Promise.all(tasksFromTodayToRemovePromise);
  for (const taskFromDayToRemove of tasksFromDayToRemove) {
    transactionWrite.delete(taskFromDayToRemove.ref);
  }

  return todaysIds.toArray();
};

const getTaskDocSnap = (transactionWrite: TransactionWrite, transaction: Transaction, roundDocSnapData: Round, roundDocSnap: DocumentSnapshot, taskId: string): Promise<DocumentSnapshot> => {
  return transaction.get(roundDocSnap.ref.collection('task').doc(taskId)).then((taskDocSnap) => {
    if (!taskDocSnap.exists) {
      testRequirement(roundDocSnapData.tasksIds.length + 1 > 25, {message: `You can own up tp 25 tasks but merge has ${roundDocSnapData.tasksIds.length + 1} 🤔`});
      transactionWrite.delete(taskDocSnap.ref);
      return transaction.get(roundDocSnap.ref.collection('task').doc());
    } else {
      return taskDocSnap;
    }
  });
};

/**
 * Save task
 * @function handler
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 * @param {CallableRequest} request
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

  const task = data.task as Task;
  task.description = task.description.trim();
  let todaysIds: string[];


  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);

    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // roundSnap must exist
    testRequirement(!roundDocSnap.exists);

    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);

    const timesOfDay = roundDocSnapData.timesOfDay;
    const timesOfDayCardinality = roundDocSnapData.timesOfDayCardinality;
    const tasksIds = roundDocSnapData.tasksIds.toSet();

    const taskDocSnap = await getTaskDocSnap(transactionWrite, transaction, roundDocSnapData, roundDocSnap, taskId);
    const taskDocSnapData = await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey);

    if (!taskDocSnap.exists) {
      created = true;
      taskId = taskDocSnap.id;
      tasksIds.add(taskId);
    } else {
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

        // read all task for user/{userId}/rounds/{roundId}/today/{day}/task/{taskId}

        const docSnaps = await Promise.all(
          roundDocSnapData.todaysIds
            .map((todayId) => transaction.get(roundDocSnap.ref.collection('today').doc(todayId)))
        );

        const todayTaskDocSnapsToUpdatePromises: any[] = [];
        const decryptTodayPromises = [];

        for (const docSnap of docSnaps) {

          decryptTodayPromises.push(decryptToday(docSnap.data() as BasicEncryptedValue, cryptoKey).then((today) => {
            if (today.tasksIds.find((id) => id === taskDocSnap.id)) {
              todayTaskDocSnapsToUpdatePromises.push(
                transaction.get(docSnap.ref.collection('task').doc(`${taskDocSnap.id}`))
              );
            }
          }));
        }

        return Promise.all(decryptTodayPromises).then(() => {
          return Promise.all(todayTaskDocSnapsToUpdatePromises).then((todayTaskDocSnapsToUpdate) => {

            /*
             * Proceed all data
             * */

            for (const todayTask of todayTaskDocSnapsToUpdate) {
              testRequirement(!todayTask.exists, {message: `Known task ${taskDocSnap.ref.path} is not related with ${todayTask.ref.path}`});

              transactionWrite.update(todayTask.ref, encrypt(task.description, cryptoKey).then((description) => {
                return {description};
              }));
            }

            transactionWrite.update(taskDocSnap.ref, encryptTask({
              description: task.description,
              timesOfDay: task.timesOfDay,
              daysOfTheWeek: task.daysOfTheWeek
            }, cryptoKey));

            return transactionWrite.execute();
          });
        });
      }

      /*
       * Only daysOfTheWeek was changed
       * */
      if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

        transactionWrite.set(taskDocSnap.ref, encryptTask(task, cryptoKey));

        // update round
        todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, taskDocSnapData, roundDocSnap, roundDocSnapData, transactionWrite, cryptoKey);
        transactionWrite.update(
          userDocSnap.ref.collection('rounds').doc(roundId),
          encryptRound({
            timesOfDay: roundDocSnapData.timesOfDay,
            timesOfDayCardinality: roundDocSnapData.timesOfDayCardinality,
            name: roundDocSnapData.name,
            todaysIds,
            tasksIds: tasksIds.toArray()
          }, cryptoKey)
        );

        return transactionWrite.execute();
      }
    }

    const decryptedTask = await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey);

    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, decryptedTask.timesOfDay, data.task.timesOfDay, timesOfDay, timesOfDayCardinality);

    // update task
    transactionWrite.set(taskDocSnap.ref, encryptTask(task, cryptoKey));

    // update round
    todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, decryptedTask, roundDocSnap, roundDocSnapData, transactionWrite, cryptoKey);

    transactionWrite.update(
      userDocSnap.ref.collection('rounds').doc(roundId),
      encryptRound({
        timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
        timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
        name: roundDocSnapData.name,
        todaysIds,
        tasksIds: tasksIds.toArray()
      }, cryptoKey)
    );

    return transactionWrite.execute();
  }).then(() => ({
    created,
    taskId,
    details: created ? 'Your task has been created 😉' : 'Your task has been updated 🙃'
  }));
};
