import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {Day, Task} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
// tslint:disable-next-line:no-import-side-effect
import '../../../../global.prototype';
import {dayIsInNumber, numberToDayArray} from '../../helpers/times-of-days';
import {getUser} from '../../helpers/user';

const app = firestore();
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[];

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
    daysOfTheWeek: a.daysOfTheWeek !== b.daysOfTheWeek
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

const proceedTodayTasks = async (transaction: Transaction, task: Task, taskDocSnap: DocumentSnapshot, timesOfDayDocSnap: DocumentSnapshot) => {

  // read all task for user/{userId}/today/{day}/task/{taskId}
  // Promise<{ docSnap: DocumentSnapshot, day: Day }[]> = [];
  const todayTaskDocSnapsDayPackPromise = [];

  for (const day of days) {
    todayTaskDocSnapsDayPackPromise.push(
      transaction.get(timesOfDayDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
        .then((docSnap) => ({docSnap, day}))
    );
  }

  const todayTaskDocSnapsDayPack = await Promise.all(todayTaskDocSnapsDayPackPromise);

  // proceedTodayTask
  for (const todayTaskDocSnapDayPack of todayTaskDocSnapsDayPack) {
    const dayIsActive = dayIsInNumber(task.daysOfTheWeek, todayTaskDocSnapDayPack.day);

    if (!todayTaskDocSnapDayPack.docSnap.exists && dayIsActive) { // set
      // add task timesOfDay
      const timesOfDay: TodayTaskTimesOfDay = {};

      for (const timeOfDay of task.timesOfDay) {
        timesOfDay[timeOfDay] = false;
      }

      transaction.set(todayTaskDocSnapDayPack.docSnap.ref, {
        description: task.description,
        timesOfDay: timesOfDay
      });
    } else if (todayTaskDocSnapDayPack.docSnap.exists && !dayIsActive) { // delete
      transaction.delete(todayTaskDocSnapDayPack.docSnap.ref);
    } else if (todayTaskDocSnapDayPack.docSnap.exists && dayIsActive) { // update

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

      const docData = todayTaskDocSnapDayPack.docSnap.data() as TodayTask;
      if (docData) {
        oldTimesOfDay = docData.timesOfDay;
      }

      // maybe there exist selected timesOfDay
      for (const newTimeOfDay of Object.keys(newTimesOfDay)) {
        if (oldTimesOfDay[newTimeOfDay]) {
          newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
        }
      }

      transaction.update(todayTaskDocSnapDayPack.docSnap.ref, {
        description: task.description,
        timesOfDay: newTimesOfDay
      });

    } else { // remove
      transaction.delete(todayTaskDocSnapDayPack.docSnap.ref);
    }

  }
};

/**
 * @function handler
 * Save task
 * @param data {
    task: {
      timesOfDay: string[],
      daysOfTheWeek: number,
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

  // data.task.daysOfTheWeek is not number between 1 and 128
  testRequirement(!Number.isInteger(data.task.daysOfTheWeek) || data.task.daysOfTheWeek < 0 || data.task.daysOfTheWeek > 128);

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

    const taskDocSnapTmp = await transaction.get(roundDocSnap.ref.collection('task').doc(taskId));

    const task = data.task as Task;
    task.description = task.description.trim();
    const roundDocSnapData = roundDocSnap.data();
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

      /*
      * Check if nothing changed or only description was changed
      * */
      const taskChange = getTaskChange((taskDocSnap.data() as Task), task);

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

        for (const day of numberToDayArray(task.daysOfTheWeek)) {
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

        await proceedTodayTasks(transaction, task, taskDocSnap, roundDocSnap);

        // update task
        transaction.set(taskDocSnap.ref, task);

        return transaction;
      }

    }

    const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, taskDocSnap.data()?.timesOfDay || [], data.task.timesOfDay, timesOfDay, timesOfDayCardinality);

    await proceedTodayTasks(transaction, task, taskDocSnap, roundDocSnap);

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
