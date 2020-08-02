import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {Day, Task} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import '../../../global.prototype';
import DocumentReference = firestore.DocumentReference;

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
 * @interface TimesOfDay
 **/
interface TimesOfDay {
  [key: string]: boolean
}

/**
 * @interface TodayTask
 **/
interface TodayTask {
  description: string;
  timesOfDay: TimesOfDay
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
    daysOfTheWeek: days.some((day) => a.daysOfTheWeek[day] !== b.daysOfTheWeek[day])
  };
}

/**
 * @function proceedTodayTask
 * Prepare today tasks
 * @param transaction Transaction
 * @param todayTaskDocSnapDayPack {docSnap: DocumentSnapshot, day: Day}
 * @param task: ITask
 * @return void
 **/
const proceedTodayTask = (transaction: Transaction, todayTaskDocSnapDayPack: {docSnap: DocumentSnapshot, day: Day}, task: Task): void => {

  if (!todayTaskDocSnapDayPack.docSnap.exists && task.daysOfTheWeek[todayTaskDocSnapDayPack.day]) { // set
    // add task timesOfDay
    const timesOfDay: TimesOfDay = {};

    task.timesOfDay.forEach((timeOfDay) => timesOfDay[timeOfDay] = false);

    transaction.set(todayTaskDocSnapDayPack.docSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if (todayTaskDocSnapDayPack.docSnap.exists && !task.daysOfTheWeek[todayTaskDocSnapDayPack.day]) { // delete
    transaction.delete(todayTaskDocSnapDayPack.docSnap.ref);
  } else if (todayTaskDocSnapDayPack.docSnap.exists && task.daysOfTheWeek[todayTaskDocSnapDayPack.day]) { // update

    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: TimesOfDay = {};

    // select inserted task timesOfDay to newTimesOfDay
    const taskTimesOdDaySet = task.timesOfDay;
    taskTimesOdDaySet.forEach((timeOfDay) => {
      newTimesOfDay[timeOfDay] = false;
    });

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    let oldTimesOfDay: TimesOfDay = {};

    const docData = todayTaskDocSnapDayPack.docSnap.data() as TodayTask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // maybe there exist selected timesOfDay
    Object.keys(newTimesOfDay).forEach((newTimeOfDay) => {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    });

    transaction.update(todayTaskDocSnapDayPack.docSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    transaction.delete(todayTaskDocSnapDayPack.docSnap.ref);
  }

};

/**
 * @function proceedTimesOfDay
 * Update times of day
 * @param transaction Transaction
 * @param taskDocSnap DocumentSnapshot
 * @param user: DocumentReference
 * @param taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot}
 * @param dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot}
 * @param currentTimesOfDaySize
 * @return { addedTimesOfDay: Set<string>, removedTimesOfDay: Set<string> }
 **/
const proceedTimesOfDay = async (
  transaction: Transaction,
  taskDocSnap: DocumentSnapshot,
  user: DocumentSnapshot,
  taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot},
  dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot},
  currentTimesOfDaySize: number): Promise<number> => {

  let addedTimesOfDay = 0;
  let removedTimesOfDay = 0;

  // get head of timesOfDay

  const firstTimeOfDayRaw = await user.ref.collection('timesOfDay').where('prev', '==', null).limit(1).get().then(async (docsSnap) => {
    if (docsSnap.size === 1) {
      return docsSnap.docs[0];
    }
    return await user.ref.collection('timesOfDay').doc().get().then((docSnap) => docSnap);
  });

  const firstDocSnap = await transaction.get(firstTimeOfDayRaw.ref).then((docSnap) => docSnap);
  let first = {
    ref: firstDocSnap.ref,
    exists: firstDocSnap.exists,
    head: true,
    data: {
      counter: firstDocSnap.data()?.counter || 1,
      prev: firstDocSnap.data()?.prev || null,
      next: firstDocSnap.data()?.next || null,
    }
  };

  // prepare next and prev of timeOfDay that will be removed
  const timesOfDayToEntanglementPromise: Promise<DocumentSnapshot>[] = [];

  for(const timeOfDay in taskDocSnapsTimesOfDay) {
    if (!dataTaskDocSnapsTimeOfDay[timeOfDay]) {
      const counter = taskDocSnapsTimesOfDay[timeOfDay].data()?.counter;
      if (counter - 1 === 0) {
        if (taskDocSnapsTimesOfDay[timeOfDay].data()?.prev) {
          timesOfDayToEntanglementPromise.push(transaction.get(user.ref.collection('timesOfDay').doc(taskDocSnapsTimesOfDay[timeOfDay].data()?.prev)).then((docSnap) => docSnap));
        }
        if (taskDocSnapsTimesOfDay[timeOfDay].data()?.next) {
          timesOfDayToEntanglementPromise.push(transaction.get(user.ref.collection('timesOfDay').doc(taskDocSnapsTimesOfDay[timeOfDay].data()?.next)).then((docSnap) => docSnap));
        }
      }
    }
  }

  const timesOfDayToEntanglement: {[p: string]: DocumentSnapshot} = {};
  (await Promise.all(timesOfDayToEntanglementPromise)).forEach((docSnap) => {
    timesOfDayToEntanglement[docSnap.id] = docSnap;
  });

  // TODO first prepare, then create
  const toCreate: {
    [p: string]: {
      ref: DocumentReference;
      exists: boolean;
      head: false;
      data: {
        counter: number;
        prev: string | null;
        next: string | null;
      }
    }
  } = {};

  for(const timeOfDay in dataTaskDocSnapsTimeOfDay) {
    if (!dataTaskDocSnapsTimeOfDay[timeOfDay].exists) {
      toCreate[timeOfDay] = {
        ref: dataTaskDocSnapsTimeOfDay[timeOfDay].ref,
        exists: first.exists,
        head: false,
        data: {
          counter: 1,
          next: first.head && !first.exists ? null : first.ref.id,
          prev: null
        }
      };

      first.data.prev = timeOfDay;
      if (first.head && first.exists) {
        transaction.update(first.ref, first.data);
      }

      first = toCreate[timeOfDay];
    }
  }

  // for each dataTaskDocSnapsTimeOfDay
  // create or increment
  for(const timeOfDay in dataTaskDocSnapsTimeOfDay) {
    if (!dataTaskDocSnapsTimeOfDay[timeOfDay].exists) {
      transaction.create(toCreate[timeOfDay].ref, toCreate[timeOfDay].data);
      addedTimesOfDay++;
    } else if (!taskDocSnapsTimesOfDay[timeOfDay]) {
      transaction.update(dataTaskDocSnapsTimeOfDay[timeOfDay].ref, {
        counter: dataTaskDocSnapsTimeOfDay[timeOfDay].data()?.counter + 1
      });
    }
  }

  // for each taskDocSnapsTimesOfDay
  // remove or decrement
  for(const timeOfDay in taskDocSnapsTimesOfDay) {
    if (!dataTaskDocSnapsTimeOfDay[timeOfDay]) {
      const counter = taskDocSnapsTimesOfDay[timeOfDay].data()?.counter;
      if (counter - 1 === 0) {

        const prev = taskDocSnapsTimesOfDay[timeOfDay].data()?.prev;
        const next = taskDocSnapsTimesOfDay[timeOfDay].data()?.next;

        if (timesOfDayToEntanglement[prev]) {
          transaction.update(timesOfDayToEntanglement[prev].ref, {next});
        }

        if (timesOfDayToEntanglement[next]) {
          transaction.update(timesOfDayToEntanglement[prev].ref, {prev});
        }

        transaction.delete(taskDocSnapsTimesOfDay[timeOfDay].ref);
        delete timesOfDayToEntanglement[timeOfDay];

        removedTimesOfDay++;
      } else {
        transaction.update(taskDocSnapsTimesOfDay[timeOfDay].ref, {
          counter: counter - 1
        });
      }
    }
  }

  const timesOfDaysToStoreLen = currentTimesOfDaySize - removedTimesOfDay + addedTimesOfDay;

  if (timesOfDaysToStoreLen > 20) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      `You can own 20 times of day but merge has ${timesOfDaysToStoreLen} 🤔`
    );
  }

  return timesOfDaysToStoreLen;

};

const getTodayTaskDocSnapsDayPackPromise = (transaction: Transaction, taskDocSnap: DocumentSnapshot, userDocSnap: DocumentSnapshot): Promise<{docSnap: firestore.DocumentSnapshot<firestore.DocumentData>, day: Day}[]> => {
  // read all task for user/{userId}/today/{day}/task/{taskId}
  // Promise<{ docSnap: DocumentSnapshot, day: Day }[]> = [];
  return Promise.all(days.map((day) =>
    transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
      .then((docSnap) => ({docSnap, day})))
  );
};

const proceedTodayTasks = (transaction: Transaction, task: Task, todayTaskDocSnapsDayPack: {docSnap: firestore.DocumentSnapshot<firestore.DocumentData>, day: Day}[]) => {
  todayTaskDocSnapsDayPack.forEach((todayTaskDocSnapDayPack) =>
    proceedTodayTask(transaction, todayTaskDocSnapDayPack, task)
  );
};

/**
 * @function handler
 * Save task
 * @param data {
    task: {
      timesOfDay: string[],
      daysOfTheWeek: {
        mon: boolean
        tue: boolean
        wed: boolean
        thu: boolean
        fri: boolean
        sat: boolean
        sun: boolean
      },
      description: string
    },
    taskId: string
  }
 * @param context CallableContext
 * @return Promise<{ created: boolean; details: string; taskId: string }>
 **/
export const handler = async (data: any, context: CallableContext): Promise<{ created: boolean; details: string; taskId: string }> => {

  const dataKeys = Object.keys(data);
  const dataTaskKeys = Object.keys(data.task);
  const dataTaskDaysOfTheWeekKeys = Object.keys(data.task.daysOfTheWeek);

  // not logged in
  testRequirement(!context.auth);

  // data is not an object
  testRequirement(typeof data !== 'object');

  // data has not 2 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'task' and 'taskId'
  testRequirement(!dataKeys.toSet().hasOnly(['task', 'taskId'].toSet()));

  // data.taskId is not string
  testRequirement(typeof data.taskId !== 'string');

  // data task is not an object
  testRequirement(typeof data.task !== 'object');

  // data.task has not 3 keys
  testRequirement(dataTaskKeys.length !== 3);

  // data.task has not ['description', 'daysOfTheWeek', 'timesOfDay']
  testRequirement(!dataTaskKeys.toSet().hasAny(['description', 'daysOfTheWeek', 'timesOfDay'].toSet()));

  // data.task.description is not a string
  testRequirement(typeof data.task.description !== 'string');

  data.task.description = data.task.description.trim();

  // data.task.description is not a string in [4, 40]
  testRequirement(data.task.description.length < 4 || data.task.description.length > 40);

  // data.task.daysOfTheWeek has not ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  testRequirement(!dataTaskDaysOfTheWeekKeys.toSet().hasAny(days.toSet()));

  // data.task.daysOfTheWeek has not boolean value
  testRequirement(dataTaskDaysOfTheWeekKeys.some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean'));

  // data.task.daysOfTheWeek has not boolean true value
  testRequirement(!dataTaskDaysOfTheWeekKeys.some((e) => data.task.daysOfTheWeek[e as Day]));

  // data.task.timesOfDay is not an array
  testRequirement(!Array.isArray(data.task.timesOfDay));

  // data.task.timesOfDay.length is not in [1, 20]
  testRequirement(data.task.timesOfDay.length === 0 || data.task.timesOfDay.length > 20);

  // data.task.timesOfDay contains duplicates
  testRequirement(data.task.timesOfDay.toSet().size !== data.task.timesOfDay.length);

  data.task.timesOfDay = data.task.timesOfDay.map((timeOfDay: any) => {

    // data.task.timesOfDay contains other than string
    testRequirement(typeof timeOfDay !== 'string');

    const timeOfDayTrim = (timeOfDay as string).trim();

    // data.task.timesOfDay contains string that trim is not in [1, 20]
    testRequirement(timeOfDayTrim.length === 0 || timeOfDayTrim.length > 20);

    // data.task.timesOfDay contains string that trim contains /
    testRequirement(timeOfDayTrim.includes('/'));

    return timeOfDayTrim;
  });

  const auth: { uid: string } | undefined = context.auth;

  let created = false;
  let taskId: string = data.taskId;

  return app.runTransaction((transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      const userData = userDocSnap.data();
      const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

      if (isDisabled) {
        throw new HttpsError(
          'permission-denied',
          'This account is disabled',
          'Contact administrator to resolve this problem'
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(taskId)).then(async (taskDocSnapTmp) => {

        const task = data.task as Task;
        task.description = task.description.trim();
        task.timesOfDay = task.timesOfDay.map((timeOfDay) => timeOfDay.trim());
        let currentTaskSize = userDocSnap.data()?.taskSize || 0;

        /*
        * Read all data
        * */

        // read task or create it
        let taskDocSnap: DocumentSnapshot;
        if (!taskDocSnapTmp.exists) {
          created = true;
          taskDocSnap = await transaction.get(userDocSnap.ref.collection('task').doc()).then((newTaskSnap) => newTaskSnap);
          taskId = taskDocSnap.id;
          currentTaskSize++;
        }
        else {
          taskDocSnap = taskDocSnapTmp;

          /*
          * Check if nothing changed or only description was changed
          * */
          const taskChange = getTaskChange((taskDocSnap.data() as Task), task);

          /*
          * Check if nothing was changed
          * */
          if (!taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDay) {
            transaction.update(taskDocSnap.ref, task);
            return transaction;
          }

          /*
          * Only description was changed
          * */
          if (taskChange.description && !taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

            // read all task for user/{userId}/today/{day}/task/{taskId}
            const todayTaskDocSnapsToUpdate = await Promise.all(
              (Object.keys(task.daysOfTheWeek) as Day[]).filter((day) => day).map((day) =>
                transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
                  .then((docSnap) => docSnap)
              )
            );

            /*
            * Proceed all data
            * */

            todayTaskDocSnapsToUpdate.forEach((todayTask) => {
              if (!todayTask.exists) {
                throw new HttpsError(
                  'invalid-argument',
                  `Known task ${taskDocSnap.ref.path} is not related with ${todayTask.ref.path}`,
                  'Some went wrong 🤫 Try again 🙂'
                );
              }
              transaction.update(todayTask.ref, {
                description: task.description
              });
            });

            transaction.update(taskDocSnap.ref, {
              description: task.description
            });

            return transaction;

          }

          /*
          * Only daysOfTheWeek was changed
          * */
          if (!taskChange.description && taskChange.daysOfTheWeek && !taskChange.timesOfDay) {

            const pack = await getTodayTaskDocSnapsDayPackPromise(transaction, taskDocSnap, userDocSnap);
            proceedTodayTasks(transaction, task, pack);

            // update task
            transaction.set(taskDocSnap.ref, task);

            return transaction;
          }

        }

        const todayTaskDocSnapsDayPackPromise = getTodayTaskDocSnapsDayPackPromise(transaction, taskDocSnap, userDocSnap);

        // read current currentTimesOfDaySize
        const currentTimesOfDaySize = userDocSnap.data()?.timesOfDaySize || 0;

        // read task timeOfDay
        // there can be new timesOfDay that not exists in firebase
        const dataTaskDocSnapsTimeOfDayPromise = (Promise.all((task.timesOfDay).map((timeOfDay) =>
          transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay)).then((docSnap) => docSnap)
        )));

        let taskDocSnapsTimesOfDay;
        const taskDocSnapData = (taskDocSnap.data() as Task);

        // read taskDocSnap timeOfDay
        if (taskDocSnapData && taskDocSnapData.timesOfDay) {
          taskDocSnapsTimesOfDay = (await Promise.all((taskDocSnap.data() as Task).timesOfDay.map((timeOfDay) =>
            transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay)).then((docSnap) => docSnap)
          ))).reduce((acc, curr) => {
            if (!curr.exists) {
              throw new HttpsError(
                'invalid-argument',
                'Bad Request',
                'Some went wrong 🤫 Try again 🙂'
              );
            }
            Object.assign(acc, {[curr.id]: curr});
            return acc;
          }, {});
        } else {
          taskDocSnapsTimesOfDay = {};
        }

        const dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot} = (await dataTaskDocSnapsTimeOfDayPromise).reduce((acc, curr) => {
          Object.assign(acc, {[curr.id]: curr});
          return acc;
        }, {});

        const timesOfDaysToStoreSize = await proceedTimesOfDay(transaction, taskDocSnap, userDocSnap, taskDocSnapsTimesOfDay, dataTaskDocSnapsTimeOfDay, currentTimesOfDaySize);
        proceedTodayTasks(transaction, task, await todayTaskDocSnapsDayPackPromise);

        // update task
        transaction.set(taskDocSnap.ref, task);

        // delete taskDocSnapTmp if created
        if (created) {
          transaction.delete(taskDocSnapTmp.ref);
        }

        // update user

        const userDataUpdate = {
          timesOfDaySize: timesOfDaysToStoreSize,
          taskSize: currentTaskSize
        };

        if (userDocSnap.exists) {
          transaction.update(userDocSnap.ref, userDataUpdate);
        } else {
          transaction.create(userDocSnap.ref, userDataUpdate);
        }

        return transaction;

      });

    })
  ).then(() =>
    created ? ({
      'created': true,
      'details': 'Your task has been created 😉',
      'taskId': taskId
    }) : ({
      'created': false,
      'details': 'Your task has been updated 🙃',
      'taskId': taskId
    })
  ).catch((error: HttpsError) => {
    const details = error.code === 'permission-denied' ? '' : error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂';
    throw new HttpsError(
      error.code,
      error.message,
      details
    );
  });

};
