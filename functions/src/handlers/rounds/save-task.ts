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
  decryptSymmetricKey,
  decryptTask, decryptToday, decryptTodayTask, encrypt, encryptRound,
  encryptTask, encryptToday,
  encryptTodayTask, getCryptoKey
} from '../../security/security';
import {EncryptedTodayTask, Round, Task} from '../../helpers/models';

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
 * @param a ITask
 * @param b ITask
 * @return ITaskDiff
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
 * @function prepareTimesOfDay
 * Update times of day
 * @param transaction Transaction
 * @param taskCurrentTimesOfDay
 * @param enteredTimesOfDay
 * @param timesOfDay
 * @param timesOfDayCardinality
 * @return { addedTimesOfDay: Set<string>, removedTimesOfDay: Set<string> }
 **/
const prepareTimesOfDay = (
  transaction: Transaction,
  taskCurrentTimesOfDay: string[],
  enteredTimesOfDay: string[],
  timesOfDay: string[],
  timesOfDayCardinality: number[]): { timesOfDay: string[], timesOfDayCardinality: number[] } => {

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

const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, taskDocSnapData: Task, roundDocSnap: DocumentSnapshot, roundDocSnapData: Round, cryptoKey: CryptoKey) => {

  const todaysIds: Set<string> = new Set(roundDocSnapData.todaysIds);

  // get all days from round
  const todayDocRefsMap: { [key in string]: DocumentSnapshot } = {};

  const docsSnapsPromises: Promise<DocumentSnapshot>[] = [];

  for (const todayId of todaysIds.toArray()) {
    docsSnapsPromises.push(transaction.get(roundDocSnap.ref.collection('today').doc(todayId)));
  }

  const docsSnaps = await Promise.all(docsSnapsPromises);

  for (const docSnap of docsSnaps) {
    todayDocRefsMap[(await decryptToday(docSnap.data() as {value: string}, cryptoKey)).name] = docSnap;
  }

  // get all days task from existed task
  const todayTaskDocSnapsDayPackPromise = [];

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(todayDocRefsMap[day].ref.collection(`task`).doc(`${taskDocSnap.id}`))
        .then((docSnap) => ({day, docSnap})));
  }

  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);
  const todayTaskDocSnapsMap: { [key in string]: DocumentSnapshot } = {};

  for (const docSnap of todayTaskDocSnapsDayPack) {
    todayTaskDocSnapsMap[docSnap.day] = docSnap.docSnap;
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

  // get to remove
  const removeTaskForDaysPromises: Promise<DocumentSnapshot>[] = [];
  for (const taskFromDayToRemove of toRemove) {
    removeTaskForDaysPromises.push(transaction.get(
      todayDocRefsMap[taskFromDayToRemove].ref.collection(`task`).doc(taskDocSnap.id)
    ).then((docSnap) => docSnap));
  }

  // get all days from new task
  // create if not exists
  const newTodayItemsForTaskToCreatePromises: Promise<{ dayToCreate: string; docSnap: DocumentSnapshot }>[] = [];
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
    todaysIds.add(item.docSnap.id)
  }

  // get new today tasks
  // on exist today's
  // on new today's
  const newTaskForDaysPromises: Promise<{ dayToCreate: string, docSnap: DocumentSnapshot }>[] = [];
  for (const dayToCreate of toCreate) {

    if (!todayDocRefsMap[dayToCreate]) {
      newTaskForDaysPromises.push(transaction.get(
        newTodayItemsMap[dayToCreate].ref.collection(`task`).doc(taskDocSnap.id)
      ).then((docSnap) => {
        return ({dayToCreate, docSnap});
      }));
    } else {
      newTaskForDaysPromises.push(transaction.get(
        todayDocRefsMap[dayToCreate].ref.collection(`task`).doc(taskDocSnap.id)
      ).then((docSnap) => {
        return ({dayToCreate, docSnap});
      }));
    }
  }

  // prepare
  // create day if not exists
  const todayDayToCreateEncryptPromise: Promise<{value: string}>[] = [];
  for (const dayToCreate of newTodayItemsForTaskToCreate) {
    todayDayToCreateEncryptPromise.push(encryptToday({
      name: dayToCreate.dayToCreate,
      taskSize: 1,
      tasksIds: [taskDocSnap.id]
    }, cryptoKey));
  }

  const newTaskForDays: { dayToCreate: string, docSnap: DocumentSnapshot }[] = await Promise.all(newTaskForDaysPromises);

  // increment taskSize if new task is in today
  for (const dayToCreate of toCreate) {
    if (todayDocRefsMap[dayToCreate]) {
      const todayTask = await decryptToday((todayDocRefsMap[dayToCreate].data() as {value: string}), cryptoKey);
      transaction.update(todayDocRefsMap[dayToCreate].ref, await encryptToday({
        taskSize: todayTask.taskSize + 1,
        name: todayTask.name,
        tasksIds: [...todayTask.tasksIds, taskDocSnap.id]
      }, cryptoKey));
    }
  }

  // create task for days

  // add task timesOfDay
  const timesOfDay: { [key in string]: boolean } = {};

  for (const timeOfDay of task.timesOfDay) {
    timesOfDay[timeOfDay] = false;
  }

  const todayTaskToAdd = await encryptTodayTask({
    description: task.description,
    timesOfDay
  }, cryptoKey);

  for (const item of newTaskForDays) {
    transaction.create(item.docSnap.ref, todayTaskToAdd);
  }

  // remove
  const removeTaskForDays = await Promise.all(removeTaskForDaysPromises);
  for (const taskDayToRemove of removeTaskForDays) {
    transaction.delete(taskDayToRemove.ref);
  }

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    if (!taskDaysOfTheWeek.has(day)) {
      const todayTaskSize = +((await decryptToday((todayDocRefsMap[day].data() as {value: string}), cryptoKey)).taskSize);
      if (todayTaskSize === 1) {
        transaction.delete(todayDocRefsMap[day].ref);
        todaysIds.delete(todayDocRefsMap[day].ref.id)
      }
    }
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

    const docData = todayTaskDocSnapsMap[dayToUpdate].data() as EncryptedTodayTask;
    if (docData) {

      const todayTask = await decryptTodayTask(docData as any, cryptoKey);
      for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
        oldTimesOfDay[timeOfDay] = todayTask.timesOfDay[timeOfDay];
      }
    }

    // maybe there exist selected timesOfDay
    const newTimesOfDay = {...newTimesOfDayRaw};
    for (const newTimeOfDay of Object.keys(newTimesOfDay)) {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    }

    transaction.set(todayTaskDocSnapsMap[dayToUpdate].ref, await encryptTodayTask({
      description: task.description,
      timesOfDay: newTimesOfDay
    }, cryptoKey));
  }

  // execute
  // create day if not exists
  const todayDayToCreateEncrypted = await Promise.all(todayDayToCreateEncryptPromise);
  for (let i = 0; i < newTodayItemsForTaskToCreate.length; ++i) {
    transaction.create(newTodayItemsForTaskToCreate[i].docSnap.ref, todayDayToCreateEncrypted[i]);
  }

  return todaysIds.toArray();
};

/**
 * @function handler
 * Save task
 * @param data {
    task: {
      timesOfDay: string[],
      daysOfTheWeek: not null like ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      description: string
    },
    taskId: string,
    roundId: string
  }
 * @param context CallableContext
 * @return Promise<{ created: boolean; details: string; taskId: string }>
 **/
export const handler = async (data: any, context: CallableContext): Promise<{ created: boolean; details: string; taskId: string }> => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

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

  // data.task.description is not a string in [1, 100]
  testRequirement(data.task.description.length < 1 || data.task.description.length > 100);

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

  const auth: { uid: string } | undefined = context.auth;

  let created = false;
  let taskId: string = data.taskId;
  const roundId: string = data.roundId;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // roundSnap must exists
    testRequirement(!roundDocSnap.exists);

    // get crypto key
    // TODO
    let cryptoKey: CryptoKey;
    if (context.auth?.token.decryptedSymmetricKey) {
      cryptoKey = await getCryptoKey(context.auth?.token.decryptedSymmetricKey, context.auth?.uid);
    } else {
      cryptoKey = await decryptSymmetricKey(context.auth?.token.encryptedSymmetricKey, context.auth?.uid);
    }

    const taskDocSnapTmp = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

    const task = data.task as Task;
    task.description = task.description.trim();

    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
    let currentTaskSize = roundDocSnapData.taskSize;
    const timesOfDay = roundDocSnapData.timesOfDay;
    const timesOfDayCardinality = roundDocSnapData.timesOfDayCardinality;
    const tasksIds = roundDocSnapData.tasksIds.toSet();

    /*
    * Read all data
    * */

    // read task or create it
    let taskDocSnap: DocumentSnapshot;
    if (!taskDocSnapTmp.exists) {
      testRequirement(currentTaskSize + 1 > 25, `You can own up tp 25 tasks but merge has ${currentTaskSize + 1} 🤔`);
      created = true;
      taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc());
      taskId = taskDocSnap.id;
      currentTaskSize++;
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
          transaction.update(todayTask.ref, {
            description: await encrypt(task.description, cryptoKey)
          });
        }

        transaction.update(taskDocSnap.ref, await encryptTask({
          description: task.description,
          timesOfDay: task.timesOfDay,
          daysOfTheWeek: task.daysOfTheWeek
        }, cryptoKey));

        return transaction;
      }

      /*
      * Only daysOfTheWeek was changed
      * */
      if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

        await proceedTodayTasks(transaction, task, taskDocSnap, taskDocSnapData, roundDocSnap, roundDocSnapData, cryptoKey);

        // update task
        transaction.set(taskDocSnap.ref, await encryptTask(task, cryptoKey));

        return transaction;
      }

    }

    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, (await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey)).timesOfDay || [], data.task.timesOfDay, timesOfDay, timesOfDayCardinality);

    const todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, await decryptTask(taskDocSnap.data() as {value: string}, cryptoKey), roundDocSnap, roundDocSnapData, cryptoKey);

    // update task
    transaction.set(taskDocSnap.ref, await encryptTask(task, cryptoKey));

    // delete taskDocSnapTmp if created
    if (created) {
      transaction.delete(taskDocSnapTmp.ref);
    }

    // update round
    const timesOfDayDataToWrite = await encryptRound({
      taskSize: currentTaskSize,
      timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
      timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
      name: roundDocSnapData.name,
      todaysIds,
      tasksIds: tasksIds.toArray()
    }, cryptoKey);

    transaction.update(userDocSnap.ref.collection('rounds').doc(roundId), timesOfDayDataToWrite);

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
