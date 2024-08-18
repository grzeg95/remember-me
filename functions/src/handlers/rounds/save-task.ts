// tslint:disable-next-line:no-import-side-effect
import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';

import '../../utils/global.prototype';
import {Round, RoundDoc} from '../../models/round';
import {Task, TaskDoc} from '../../models/task';
import {Today, TodayDoc} from '../../models/today';
import {TodayTask, TodayTaskDoc} from '../../models/today-task';
import {encrypt, getCryptoKey, protectObjectDecryption} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const app = getFirestore();

/**
 * @interface TaskDiff
 **/
interface TaskDiff {
  description: boolean,
  timesOfDayIds: boolean,
  daysOfTheWeek: boolean
}

/**
 * @function getTaskChange
 * @param {Task} a
 * @param {Task} b
 * @return {TaskDiff}
 **/
const getTaskChange = (a: Task, b: Task): TaskDiff => {
  const aTimesOfDayIds = a.timesOfDayIds.toSet();
  const bTimesOfDayIds = b.timesOfDayIds.toSet();
  return {
    description: a.description !== b.description,
    timesOfDayIds: !aTimesOfDayIds.hasOnly(bTimesOfDayIds),
    daysOfTheWeek: !a.daysOfTheWeek.toSet().hasOnly(b.daysOfTheWeek.toSet())
  };
};

/**
 * Update times of day
 * @function prepareTimesOfDay
 * @param {FirebaseFirestore.Transaction} transaction
 * @param {Array<string>} taskCurrentTimesOfDayIds
 * @param {Array<string>} enteredTimesOfDayIds
 * @param {Array<string>} timesOfDayIds
 * @param {Array<string>} timesOfDayIdsCardinality
 * @return {{addedTimesOfDay: Set<string>, removedTimesOfDay: Set<string>}}
 **/
export const prepareTimesOfDay = (
  transaction: Transaction,
  taskCurrentTimesOfDayIds: string[],
  enteredTimesOfDayIds: string[],
  timesOfDayIds: string[],
  timesOfDayIdsCardinality: number[]): {timesOfDayIds: string[], timesOfDayIdsCardinality: number[]} => {

  const toAdd = enteredTimesOfDayIds.toSet().difference(taskCurrentTimesOfDayIds.toSet());
  const toRemove = taskCurrentTimesOfDayIds.toSet().difference(enteredTimesOfDayIds.toSet());

  for (const timeOfDay of toRemove) {
    const indexToRemove = timesOfDayIds.indexOf(timeOfDay);
    if (indexToRemove > -1) {
      if (timesOfDayIdsCardinality[indexToRemove] - 1 === 0) {
        timesOfDayIdsCardinality.splice(indexToRemove, 1);
        timesOfDayIds.splice(indexToRemove, 1);
      } else {
        timesOfDayIdsCardinality[indexToRemove]--;
      }
    }
  }

  for (const timeOfDay of toAdd) {
    const indexToAdd = timesOfDayIds.indexOf(timeOfDay);
    if (indexToAdd > -1) {
      timesOfDayIdsCardinality[indexToAdd]++;
    } else {
      timesOfDayIdsCardinality.unshift(1);
      timesOfDayIds.unshift(timeOfDay);
    }
  }

  testRequirement(timesOfDayIds.length > 10, {message: `You can own 10 times of day but merge has ${timesOfDayIds.length} 🤔`});

  return {
    timesOfDayIds: [...timesOfDayIds],
    timesOfDayIdsCardinality: [...timesOfDayIdsCardinality]
  };
};

export const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, taskDocSnapData: Task, roundDocSnap: DocumentSnapshot<Round, RoundDoc>, roundDocSnapData: Round, transactionWrite: TransactionWrite, cryptoKey: CryptoKey) => {

  // create task for days
  // add task timesOfDay
  const timeOfDayIntoDoneMap: { [key in string]: boolean } = {};

  for (const timeOfDayId of task.timesOfDayIds) {
    timeOfDayIntoDoneMap[timeOfDayId] = false;
  }

  const todayTasksIds = roundDocSnapData.todayTasksIds.toSet();

  // get all days from round
  const todayDocRefsMap: {
    [key in string]: {
      docSnap: DocumentSnapshot<Today, TodayTask>,
      today: Today
    }
  } = {};

  const docsSnapsPromises: Promise<DocumentSnapshot<Today, TodayDoc>>[] = [];

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

  for (const todayTaskId of todayTasksIds.toArray()) {

    const todayRef = Today.ref(roundDocSnap.ref, todayTaskId);
    docsSnapsPromises.push(transaction.get(todayRef));
  }

  const docsSnaps = await Promise.all(docsSnapsPromises);

  const decryptedTodayPromise = [];

  for (const docSnap of docsSnaps) {
    decryptedTodayPromise.push(
      Today.data(docSnap, cryptoKey)
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

    const todayTaskRef = TodayTask.ref(todayDocRefsMap[day].docSnap.ref, taskDocSnap.id);

    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(todayTaskRef)
        .then((docSnap) => ({day, docSnap}))
    );
  }

  // get all days task from existed task
  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);

  const decryptedTodayTaskDocSnapsPromise = [];

  for (const docSnapPack of todayTaskDocSnapsDayPack) {
    decryptedTodayTaskDocSnapsPromise.push(TodayTask.data(docSnapPack.docSnap, cryptoKey));
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
    todayTasksIds.add(item.docSnap.id);
  }

  const encryptedDescription = await encrypt(task.description, cryptoKey);

  const encryptedTimeOfDayIntoDoneMap: { [key in string]: boolean } = {};

  for (const timeOfDayIntoDoneMapKey of Object.getOwnPropertyNames(timeOfDayIntoDoneMap)) {
    encryptedTimeOfDayIntoDoneMap[await encrypt(timeOfDayIntoDoneMapKey, cryptoKey)] = timeOfDayIntoDoneMap[timeOfDayIntoDoneMapKey];
  }

  const encryptedTodayTaskToAdd = {
    encryptedDescription,
    encryptedTimeOfDayIntoDoneMap
  } as TodayTaskDoc;

  // get new today tasks
  // on exist today's
  // on new today's
  for (const dayToCreate of toCreate) {

    if (!todayDocRefsMap[dayToCreate]) {
      transactionWrite.create(
        newTodayItemsMap[dayToCreate].ref.collection('todayTask').doc(taskDocSnap.id),
        encryptedTodayTaskToAdd
      );
    } else {
      transactionWrite.create(
        todayDocRefsMap[dayToCreate].docSnap.ref.collection('todayTask').doc(taskDocSnap.id),
        encryptedTodayTaskToAdd
      );
    }
  }

  // prepare
  // create day if not exists
  for (const dayToCreate of newTodayItemsForTaskToCreate) {

    const encryptedName = await encrypt(dayToCreate.dayToCreate, cryptoKey);

    transactionWrite.create(dayToCreate.docSnap.ref, {
      encryptedName,
      todayTasksIds: [taskDocSnap.id]
    } as Today);
  }

  // increment taskSize if new task is in today
  for (const dayToCreate of toCreate) {
    if (todayDocRefsMap[dayToCreate]) {

      const todayTask = todayDocRefsMap[dayToCreate].today;
      const encryptedName = await encrypt(todayTask.name, cryptoKey);

      transactionWrite.update(todayDocRefsMap[dayToCreate].docSnap.ref, {
        encryptedName,
        todayTasksIds: [...todayTask.todayTasksIds, taskDocSnap.id]
      } as Today);
    }
  }

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    if (!taskDaysOfTheWeek.has(day)) {

      const todayTaskIds = todayDocRefsMap[day].today.todayTasksIds;

      if (todayTaskIds.length === 1) {
        transactionWrite.delete(todayDocRefsMap[day].docSnap.ref);
        todayTasksIds.delete(todayDocRefsMap[day].docSnap.ref.id);
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
  const newTimesOfDayIdsRaw: { [key in string]: boolean } = {};

  // select inserted task timesOfDay to newTimesOfDayRaw
  for (const timeOfDayId of task.timesOfDayIds) {
    newTimesOfDayIdsRaw[timeOfDayId] = false;
  }

  for (const dayToUpdate of toUpdate) {

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    const oldTimesOfDay: { [key in string]: boolean } = {};

    const todayTask = todayTaskDocSnapsMap[dayToUpdate].todayTask;

    for (const encryptedTimeOfDay of Object.keys(todayTask.encryptedTimeOfDayIntoDoneMap)) {
      oldTimesOfDay[encryptedTimeOfDay] = todayTask.encryptedTimeOfDayIntoDoneMap[encryptedTimeOfDay];
    }

    // maybe there exist selected timesOfDay
    const newTimesOfDay = {...newTimesOfDayIdsRaw};
    for (const newTimeOfDay of Object.keys(newTimesOfDay)) {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    }

    const encryptedNewTimesOfDay = await encrypt(newTimesOfDay, cryptoKey);
    transactionWrite.set(todayTaskDocSnapsMap[dayToUpdate].docSnap.ref, {
      encryptedDescription,
      encryptedTimesOfDay: encryptedNewTimesOfDay
    });
  }

  // remove tasks from day to remove
  const tasksFromDayToRemove = await Promise.all(tasksFromTodayToRemovePromise);
  for (const taskFromDayToRemove of tasksFromDayToRemove) {
    transactionWrite.delete(taskFromDayToRemove.ref);
  }

  return todayTasksIds.toArray();
};

const getTaskDocSnap = (transactionWrite: TransactionWrite, transaction: Transaction, roundDocSnapData: Round, roundDocSnap: DocumentSnapshot<Round, RoundDoc>, taskId: string) => {

  let taskRef = Task.ref(roundDocSnap.ref, taskId);

  return transaction.get(taskRef).then((taskDocSnap) => {
    if (!taskDocSnap.exists) {
      testRequirement(roundDocSnapData.tasksIds.length + 1 > 25, {message: `You can own up tp 25 tasks but merge has ${roundDocSnapData.tasksIds.length + 1} 🤔`});
      transactionWrite.delete(taskDocSnap.ref);
      taskRef = Task.ref(roundDocSnap.ref, undefined);
      return transaction.get(taskRef);
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

  // data.task has not ['description', 'daysOfTheWeek', 'timesOfDayIds']
  testRequirement(!dataTaskKeys.toSet().hasAny(['description', 'daysOfTheWeek', 'timesOfDayIds'].toSet()));

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

  // data.task.timesOfDayIds is not an array
  testRequirement(!Array.isArray(data.task.timesOfDayIds));

  // data.task.timesOfDayIds.length is not in [1, 10]
  testRequirement(data.task.timesOfDayIds.length === 0 || data.task.timesOfDayIds.length > 10);

  const timesOfDayIdsTmp = [];
  for (const timeOfDay of data.task.timesOfDayIds) {
    // data.task.timesOfDayIds contains other than string
    testRequirement(typeof timeOfDay !== 'string');

    const timeOfDayTrim = (timeOfDay as string).trim();

    // data.task.timesOfDayIds contains string that trim is not in [1, 100]
    testRequirement(timeOfDayTrim.length === 0 || timeOfDayTrim.length > 100);

    timesOfDayIdsTmp.push(timeOfDayTrim);
  }
  data.task.timesOfDayIds = timesOfDayIdsTmp;

  // data.task.timesOfDayIds contains duplicates
  testRequirement(data.task.timesOfDayIds.toSet().size !== data.task.timesOfDayIds.length);

  let created = false;
  let taskId: string = data.taskId;
  const roundId: string = data.roundId;

  data.task.description = data.task.description.trim();
  let todayTasksIds: string[];

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);

    const roundRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnap = await transaction.get(roundRef);

    // roundSnap must exist
    testRequirement(!roundDocSnap.exists);

    const roundDocSnapData = await Round.data(roundDocSnap, cryptoKey);

    const timesOfDayIds = roundDocSnapData.timesOfDayIds;
    const timesOfDayIdsCardinality = roundDocSnapData.timesOfDayIdsCardinality;
    const tasksIds = roundDocSnapData.tasksIds.toSet();

    const taskDocSnap = await getTaskDocSnap(transactionWrite, transaction, roundDocSnapData, roundDocSnap, taskId);
    const taskDocSnapData = await Task.data(taskDocSnap, cryptoKey);

    if (!taskDocSnap.exists) {
      created = true;
      taskId = taskDocSnap.id;
      tasksIds.add(taskId);
    } else {
      /*
       * Check if nothing changed or only description was changed
       * */
      const taskChange = getTaskChange(taskDocSnapData, data.task);

      /*
       * Check if nothing was changed
       * */
      testRequirement(!taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDayIds);

      /*
       * Only description was changed
       * */
      if (taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDayIds) {

        // read all task for user/{userId}/rounds/{roundId}/today/{day}/task/{taskId}

        const docSnaps = await Promise.all(
          roundDocSnapData.todayTasksIds
            .map((todayTaskId) => transaction.get(Today.ref(roundDocSnap.ref, todayTaskId)))
        );

        const todayTaskDocSnapsToUpdatePromises: Promise<DocumentSnapshot<TodayTask, TodayTaskDoc>>[] = [];
        const decryptTodayPromises = [];

        for (const docSnap of docSnaps) {

          decryptTodayPromises.push(Today.data(docSnap, cryptoKey).then((today) => {
            if (today.todayTasksIds.find((id) => id === taskDocSnap.id)) {

              const todayTaskRef = TodayTask.ref(docSnap.ref, taskDocSnap.id);

              todayTaskDocSnapsToUpdatePromises.push(
                transaction.get(todayTaskRef)
              );
            }
          }));
        }

        return Promise.all(decryptTodayPromises).then(() => {
          return Promise.all(todayTaskDocSnapsToUpdatePromises).then(async (todayTaskDocSnapsToUpdate) => {

            /*
             * Proceed all data
             * */

            const encryptedDescription = await encrypt(data.task.description, cryptoKey);

            for (const todayTask of todayTaskDocSnapsToUpdate) {
              testRequirement(!todayTask.exists, {message: `Known task ${taskDocSnap.ref.path} is not related with ${todayTask.ref.path}`});

              transactionWrite.update(todayTask.ref, {
                encryptedDescription
              } as TodayTaskDoc);
            }

            transactionWrite.update(taskDocSnap.ref, {
              encryptedDescription
            } as TaskDoc);

            return transactionWrite.execute();
          });
        });
      }

      /*
       * Only daysOfTheWeek was changed
       * */
      if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDayIds) {

        const encryptedDescription = await encrypt(data.task.description, cryptoKey);

        const encryptedDaysOfTheWeek: string[] = [];

        for (const day of data.task.daysOfTheWeek) {
          encryptedDaysOfTheWeek.push(await encrypt(day, cryptoKey));
        }

        const encryptedTimesOfDayIdsForTask: string[] = [];

        for (const timesOfDayId of data.task.timesOfDayIds) {
          encryptedTimesOfDayIdsForTask.push(await encrypt(timesOfDayId, cryptoKey));
        }

        transactionWrite.set(taskDocSnap.ref, {
          encryptedDescription,
          encryptedTimesOfDayIds: encryptedTimesOfDayIdsForTask,
          encryptedDaysOfTheWeek
        } as TaskDoc);

        // update round
        todayTasksIds = await proceedTodayTasks(transaction, data.task, taskDocSnap, taskDocSnapData, roundDocSnap, roundDocSnapData, transactionWrite, cryptoKey);

        transactionWrite.update(
          userDocSnap.ref.collection('rounds').doc(roundId),
          {
            todayTasksIds
          } as RoundDoc
        );

        return transactionWrite.execute();
      }
    }

    const decryptedTask = await Task.data(taskDocSnap, cryptoKey);

    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, decryptedTask.timesOfDayIds, data.task.timesOfDayIds, timesOfDayIds, timesOfDayIdsCardinality);

    const encryptedDescription = await encrypt(data.task.description, cryptoKey);
    const encryptedDaysOfTheWeek: string[] = [];

    for (const day of data.task.daysOfTheWeek) {
      encryptedDaysOfTheWeek.push(await encrypt(day, cryptoKey).then(protectObjectDecryption('')));
    }

    const encryptedTimesOfDayIdsForTask: string[] = [];

    for (const timesOfDayId of data.task.timesOfDayIds) {
      encryptedTimesOfDayIdsForTask.push(await encrypt(timesOfDayId, cryptoKey));
    }

    // update task
    transactionWrite.set(taskDocSnap.ref, {
      encryptedDescription,
      encryptedTimesOfDayIds: encryptedTimesOfDayIdsForTask,
      encryptedDaysOfTheWeek
    } as TaskDoc);

    // update round
    todayTasksIds = await proceedTodayTasks(transaction, data.task, taskDocSnap, decryptedTask, roundDocSnap, roundDocSnapData, transactionWrite, cryptoKey);

    const encryptedName = await encrypt(roundDocSnapData.name, cryptoKey);

    const encryptedTimesOfDayIds: string[] = [];

    for (const timesOfDayId of timesOfDaysToStoreMetadata.timesOfDayIds) {
      encryptedTimesOfDayIds.push(await encrypt(timesOfDayId, cryptoKey));
    }

    transactionWrite.update(
      userDocSnap.ref.collection('rounds').doc(roundId),
      {
        encryptedTimesOfDayIds: encryptedTimesOfDayIds,
        timesOfDayIdsCardinality: timesOfDaysToStoreMetadata.timesOfDayIdsCardinality,
        encryptedName,
        todayTasksIds,
        tasksIds: tasksIds.toArray()
      } as RoundDoc
    );

    return transactionWrite.execute();
  }).then(() => ({
    created,
    taskId,
    details: created ? 'Your task has been created 😉' : 'Your task has been updated 🙃'
  }));
};
