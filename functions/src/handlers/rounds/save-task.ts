// tslint:disable-next-line:no-import-side-effect
import '../../../../global.prototype';
import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {decrypt} from '../../security/decrypt';
import {decryptPrivateKey} from '../../security/decrypt-private-key';
import {Task} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import {getUser} from '../../helpers/user';
import {decryptRound} from '../../security/decrypt-round';
import {decryptTask} from '../../security/decrypt-task';
import {encrypt} from '../../security/encrypt';

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
 * @interface TodayTaskTimesOfDay
 **/
interface TodayTaskTimesOfDay {
  [key: string]: boolean;
}

/**
 * @interface TodayTask
 **/
interface TodayTask {
  description: string;
  timesOfDay: TodayTaskTimesOfDay;
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
  timesOfDayCardinality: number[]): {
  timesOfDay: string[],
  timesOfDayCardinality: number[]
} => {

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

const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, taskDocSnapData: Task, roundDocSnap: DocumentSnapshot, privateKey: string) => {

  // read all daysOfTheWeek from taskDocSnap
  // Promise<DocumentSnapshot[]> = [];
  const todayTaskDocSnapsDayPackPromise = [];

  const docRefsMap: {[key in string]: DocumentSnapshot} = {};
  roundDocSnap.ref.collection('today').listDocuments().then(async (docRefs) => {
    for (const docRef of docRefs) {
      docRefsMap[decrypt(docRef.id, privateKey)] = (await transaction.get(docRef));
    }
  });

  for (const day of taskDocSnapData.daysOfTheWeek || []) {
    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(docRefsMap[day].ref.collection(`task`).doc(`${taskDocSnap.id}`))
        .then((docSnap) => ({day, docSnap})));
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

  const newDaysPromises: Promise<{dayToCreate: string, docSnap: DocumentSnapshot}>[] = [];
  for (const dayToCreate of toCreate) {
    newDaysPromises.push(transaction.get(roundDocSnap.ref.collection(`today/${dayToCreate}/task`).doc(taskDocSnap.id)).then((docSnap) =>
      ({dayToCreate, docSnap})
    ));
  }

  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);
  const todayTaskDocSnapsMap: {[key in string]: DocumentSnapshot} = {};

  for (const docSnap of todayTaskDocSnapsDayPack) {
    todayTaskDocSnapsMap[docSnap.day] = docSnap.docSnap;
  }

  // create
  const newDays = await Promise.all(newDaysPromises);
  const newDaysMap: {[key in string]: DocumentSnapshot} = {};

  for (const newDay of newDays) {
    newDaysMap[newDay.dayToCreate] = newDay.docSnap;
  }

  for (const dayToCreate of toCreate) {

    // add task timesOfDay
    const timesOfDay: TodayTaskTimesOfDay = {};

    for (const timeOfDay of task.timesOfDay) {
      timesOfDay[timeOfDay] = false;
    }

    transaction.create(newDaysMap[dayToCreate].ref, {
      description: encrypt(task.description, privateKey),
      timesOfDay: encrypt(timesOfDay, privateKey)
    });
  }

  // remove
  for (const dayToRemove of toRemove) {
    transaction.delete(todayTaskDocSnapsMap[dayToRemove].ref);
  }

  // update
  for (const dayToUpdate of toUpdate) {
    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: TodayTaskTimesOfDay = {};

    // select inserted task timesOfDay to newTimesOfDay
    const taskTimesOdDaySet = task.timesOfDay;
    for (const timeOfDay of taskTimesOdDaySet) {
      newTimesOfDay[timeOfDay] = false;
    }

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    let oldTimesOfDay: TodayTaskTimesOfDay = {};

    const docData = todayTaskDocSnapsMap[dayToUpdate].data() as TodayTask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // maybe there exist selected timesOfDay
    for (const newTimeOfDay of Object.keys(newTimesOfDay)) {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    }

    transaction.update(todayTaskDocSnapsMap[dayToUpdate].ref, {
      description: encrypt(task.description, privateKey),
      timesOfDay: encrypt(newTimesOfDay, privateKey)
    });
  }
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

    // get private key
    const privateKey = await decryptPrivateKey(context.auth?.token.privateKey);
    testRequirement(typeof privateKey !== 'string' || privateKey.length === 0);

    const taskDocSnapTmp = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

    const task = data.task as Task;
    task.description = task.description.trim();
    const roundDocSnapData = decryptRound(roundDocSnap.data(), privateKey);
    let currentTaskSize = roundDocSnapData?.taskSize || 0;
    const timesOfDay = roundDocSnapData?.timesOfDay || [];
    const timesOfDayCardinality = roundDocSnapData?.timesOfDayCardinality || [];

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
    } else {
      taskDocSnap = taskDocSnapTmp;
      const taskDocSnapData = decryptTask(taskDocSnap.data(), privateKey) as Task;

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

        for (const day of task.daysOfTheWeek) {
          todayTaskDocSnapsToUpdatePromises.push(
            transaction.get(roundDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
          );
        }

        const todayTaskDocSnapsToUpdate = await Promise.all(todayTaskDocSnapsToUpdatePromises);

        /*
        * Proceed all data
        * */

        for (const todayTask of todayTaskDocSnapsToUpdate) {
          testRequirement(!todayTask.exists, `Known task ${taskDocSnap.ref.path} is not related with ${todayTask.ref.path}`);
          transaction.update(todayTask.ref, {
            description: task.description
          });
        }

        transaction.update(taskDocSnap.ref, {
          description: task.description
        });

        return transaction;
      }

      /*
      * Only daysOfTheWeek was changed
      * */
      if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

        await proceedTodayTasks(transaction, task, taskDocSnap, taskDocSnapData, roundDocSnap, privateKey);

        // update task
        transaction.set(taskDocSnap.ref, task);

        return transaction;
      }

    }

    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, decryptTask(taskDocSnap.data(), privateKey).timesOfDay || [], data.task.timesOfDay, timesOfDay, timesOfDayCardinality);

    await proceedTodayTasks(transaction, task, taskDocSnap, decryptTask(taskDocSnap.data(), privateKey), roundDocSnap, privateKey);

    // update task
    transaction.set(taskDocSnap.ref, task);

    // delete taskDocSnapTmp if created
    if (created) {
      transaction.delete(taskDocSnapTmp.ref);
    }

    // update timesOfDay
    const timesOfDayDataToWrite = {
      taskSize: currentTaskSize,
      timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
      timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
    };

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
