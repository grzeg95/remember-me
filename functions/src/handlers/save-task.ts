import {DocumentReference, DocumentSnapshot, Transaction} from '@google-cloud/firestore';
import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {keysEqual} from '../helpers/keys-equal';
import {Day, ITask} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';

const app = firestore();

/**
 * @interface ITaskDiff
 **/
interface ITaskDiff {
  description: {
    type: 'unchanged' | 'changed',
    old: string,
    new: string
  },
  timesOfDay: {
    new: string[],
    removed: string[]
  },
  daysOfTheWeek: {
    mon: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    tue: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    wed: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    thu: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    fri: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    sat: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    },
    sun: {
      type: 'unchanged' | 'changed',
      old: boolean,
      new: boolean
    }
  }
}

/**
 * @interface ITodayTask
 **/
interface ITodayTask {
  description: string;
  timesOfDay: {
    [key: string]: boolean
  };
}

/**
 * @function taskDiff
 * @param A ITask
 * @param B ITask
 * @return ITaskDiff
 **/
const taskDiff = (A: ITask, B: ITask): ITaskDiff => {
  return {
    description: {
      type: A.description === B.description ? 'unchanged' : 'changed',
      old: A.description,
      new: B.description
    },
    timesOfDay: {
      new: B.timesOfDay.filter((timeOfDay) => !A.timesOfDay.includes(timeOfDay)),
      removed: A.timesOfDay.filter((timeOfDay) => !B.timesOfDay.includes(timeOfDay))
    },
    daysOfTheWeek: {
      mon: {
        type: A.daysOfTheWeek.mon === B.daysOfTheWeek.mon ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.mon,
        new: B.daysOfTheWeek.mon
      },
      tue: {
        type: A.daysOfTheWeek.tue === B.daysOfTheWeek.tue ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.tue,
        new: B.daysOfTheWeek.tue
      },
      wed: {
        type: A.daysOfTheWeek.wed === B.daysOfTheWeek.wed ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.wed,
        new: B.daysOfTheWeek.wed
      },
      thu: {
        type: A.daysOfTheWeek.thu === B.daysOfTheWeek.thu ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.thu,
        new: B.daysOfTheWeek.thu
      },
      fri: {
        type: A.daysOfTheWeek.fri === B.daysOfTheWeek.fri ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.fri,
        new: B.daysOfTheWeek.fri
      },
      sat: {
        type: A.daysOfTheWeek.sat === B.daysOfTheWeek.sat ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.sat,
        new: B.daysOfTheWeek.sat
      },
      sun: {
        type: A.daysOfTheWeek.sun === B.daysOfTheWeek.sun ? 'unchanged' : 'changed',
        old: A.daysOfTheWeek.sun,
        new: B.daysOfTheWeek.sun
      }
    }
  };
}

/**
 * @function daysOfTheWeekChanged
 * @param diff ITaskDiff
 * @return boolean
 **/
const daysOfTheWeekChanged = (diff: ITaskDiff): boolean => {
  return (
    diff.daysOfTheWeek.fri.type === 'changed' ||
    diff.daysOfTheWeek.mon.type === 'changed' ||
    diff.daysOfTheWeek.sat.type === 'changed' ||
    diff.daysOfTheWeek.sun.type === 'changed' ||
    diff.daysOfTheWeek.thu.type === 'changed' ||
    diff.daysOfTheWeek.tue.type === 'changed' ||
    diff.daysOfTheWeek.wed.type === 'changed'
  );
};

/**
 * @function proceedTodayTask
 * Prepare today tasks
 * @param transaction Transaction
 * @param todayTaskDocSnap DocumentSnapshot
 * @param task: ITask
 * @param day: Day
 * @return void
 **/
const proceedTodayTask = (transaction: Transaction, todayTaskDocSnap: DocumentSnapshot, task: ITask, day: Day): void => {

  if (!todayTaskDocSnap.exists && task.daysOfTheWeek[day]) { // set
    // add task timesOfDay
    const timesOfDay: {
      [key: string]: boolean;
    } = {};

    task.timesOfDay.forEach((timeOfDay) => timesOfDay[timeOfDay.trim()] = false);

    transaction.set(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if (todayTaskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
    transaction.delete(todayTaskDocSnap.ref);
  } else if (todayTaskDocSnap.exists && task.daysOfTheWeek[day]) { // update

    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: {
      [key: string]: boolean;
    } = {};

    // select inserted task timesOfDay to newTimesOfDay
    const taskTimesOdDaySet = new Set(task.timesOfDay);
    taskTimesOdDaySet.forEach((timeOfDay) => {
      newTimesOfDay[timeOfDay.trim()] = false;
    });

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    let oldTimesOfDay: {
      [key: string]: boolean;
    } = {};
    const docData = todayTaskDocSnap.data() as ITodayTask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // maybe there exist selected timesOfDay
    Object.keys(newTimesOfDay).forEach((newTimeOfDay) => {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    });

    transaction.update(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    transaction.delete(todayTaskDocSnap.ref);
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
 * @return { addedTimesOfDay: string[], removedTimesOfDay: string[] }
 **/
const proceedTimesOfDay =
  (transaction: Transaction,
   taskDocSnap: DocumentSnapshot,
   user: DocumentReference,
   taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot},
   dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot}): { addedTimesOfDay: string[], removedTimesOfDay: string[] } => {

  const addedTimesOfDay: string[] = [];
  const removedTimesOfDay: string[] = [];

  // for each dataTaskDocSnapsTimeOfDay
  // create or increment
  for(const timeOfDay in dataTaskDocSnapsTimeOfDay) {
    if (!dataTaskDocSnapsTimeOfDay[timeOfDay].exists) {
      transaction.create(dataTaskDocSnapsTimeOfDay[timeOfDay].ref, {
        counter: 1,
        position: 0
      });
      addedTimesOfDay.push(timeOfDay);
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
        transaction.delete(taskDocSnapsTimesOfDay[timeOfDay].ref);
        removedTimesOfDay.push(timeOfDay);
      } else {
        transaction.update(taskDocSnapsTimesOfDay[timeOfDay].ref, {
          counter: counter - 1
        });
      }
    }
  }

  return {addedTimesOfDay, removedTimesOfDay};

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

  let dataKeys;
  let dataTaskKeys;
  let dataTaskDaysOfTheWeekKeys;

  testRequirement(
    "not logged in",
    !context.auth
  );

  testRequirement(
    "data is not an object",
    typeof data !== 'object', data
  );

  testRequirement(
    "data has not 2 keys",
    (dataKeys = Object.keys(data)).length !== 2,
    dataKeys
  );

  testRequirement(
    "data has not 'task' and 'taskId'",
    !keysEqual(dataKeys, ['task', 'taskId']),
    dataKeys
  );

  testRequirement(
    "data.taskId is not string",
    typeof data.taskId !== 'string',
    data.taskId
  );

  testRequirement(
    "data task is not an object",
    typeof data.task !== 'object',
    data.task
  );

  testRequirement(
    "data.task has not 3 keys",
    (dataTaskKeys = Object.keys(data.task)).length !== 3,
    dataTaskKeys
  );

  testRequirement(
    "data.task has not 'description', 'daysOfTheWeek', 'timesOfDay'",
    !keysEqual(dataTaskKeys, ['description', 'daysOfTheWeek', 'timesOfDay']),
    dataTaskKeys
  );

  testRequirement(
    "data.task.description iss not a string [4, 40]",
    typeof data.task.description !== 'string' || data.task.description.length <= 3 || data.task.description.length > 40,
    data.task.description
  );

  testRequirement(
    "data.task.daysOfTheWeek has not 5 keys",
    (dataTaskDaysOfTheWeekKeys = Object.keys(data.task.daysOfTheWeek)).length !== 7,
    dataTaskDaysOfTheWeekKeys
  );

  testRequirement(
    "data.task.daysOfTheWeek has not 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'",
    !keysEqual(dataTaskDaysOfTheWeekKeys, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    dataTaskDaysOfTheWeekKeys
  );

  testRequirement(
    "data.task.daysOfTheWeek has not boolean value",
    dataTaskDaysOfTheWeekKeys.some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean'),
    dataTaskDaysOfTheWeekKeys
  );

  testRequirement(
    "data.task.daysOfTheWeek has not boolean true value",
    !dataTaskDaysOfTheWeekKeys.some((e) => data.task.daysOfTheWeek[e as Day]),
    dataTaskDaysOfTheWeekKeys
  );

  testRequirement(
    "data.task.timesOfDay is not an array",
    !Array.isArray(data.task.timesOfDay),
    data.task.timesOfDay
  );

  testRequirement(
    "data.task.timesOfDay.length is 0",
    data.task.timesOfDay.length === 0,
    data.task.timesOfDay
  );

  testRequirement(
    "data.task.timesOfDay.length has over 20 values",
    data.task.timesOfDay.length > 20,
    data.task.timesOfDay
  );

  testRequirement(
    "data.task.timesOfDay contains duplicates",
    new Set(data.task.timesOfDay).size !== data.task.timesOfDay.length,
    data.task.timesOfDay
  );

  testRequirement(
    "data.task.timesOfDay contains not string, trim is not in [1, 20] or contains /",
    data.task.timesOfDay.some((e: any) => typeof e !== 'string' || e.trim().length < 1 || e.trim().length > 20 || e.trim().includes('/')),
    data.task.timesOfDay
  );

  const auth: { uid: string } | undefined = context.auth;

  let created = false;
  let taskId: string = data.taskId;

  return app.runTransaction((transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      if (userDocSnap.data()?.blocked === true) {
        console.error({
          'info': 'user is blocked'
        });
        throw new HttpsError(
          'permission-denied',
          '',
          ''
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(taskId)).then(async (taskDocSnapTmp) => {

        const task = data.task as ITask;
        task.description = task.description.trim();
        task.timesOfDay = task.timesOfDay.map((timeOfDay) => timeOfDay.trim());

        /*
        * Read all data
        * */

        // read task or create it
        let taskDocSnap: DocumentSnapshot;
        if (!taskDocSnapTmp.exists) {
          created = true;
          taskDocSnap = await transaction.get(userDocSnap.ref.collection('task').doc()).then(async (newTaskSnap) => newTaskSnap);
          taskId = taskDocSnap.id;
        } else {
          taskDocSnap = taskDocSnapTmp;

          /*
          * Check if nothing changed or only description was changed
          * */

          const diff = taskDiff((taskDocSnap.data() as ITask), task);

          if (!daysOfTheWeekChanged(diff) && diff.timesOfDay.new.length === 0 && diff.timesOfDay.removed.length === 0) {

            /*
            * Check if nothing changed
            * */
            if (diff.description.type === 'unchanged') {
              transaction.update(taskDocSnap.ref, task);
              return transaction;
            }

            /*
            * Check if only description was changed
            * */
            if (diff.description.type === 'changed') {

              // read all task for user/{userId}/today/{day}/task/{taskId}
              const todayTaskDocSnapsToUpdate = await Promise.all((Object.keys(task.daysOfTheWeek) as Day[])
                .map((day) =>
                  transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
                    .then((docSnap) => docSnap)
                )
              );

              /*
              * Proceed all data
              * */

              todayTaskDocSnapsToUpdate.forEach((todayTask) => {
                if (!todayTask.exists) {
                  console.error({
                    'info': 'task is not related today task'
                  });
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

          }

        }

        // read all task for user/{userId}/today/{day}/task/{taskId}
        // Promise<{ docSnap: DocumentSnapshot, day: Day }>[] = [];
        const todayTaskDocSnapsPromise = Promise.all((['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[])
          .map((day) =>
            transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
              .then((docSnap) => ({docSnap, day})))
        );

        // read current timesOfDay
        const currentTimesOfDay: {[timeOfDay: string]: DocumentSnapshot} = (
          await Promise.all((await userDocSnap.ref.collection('timesOfDay').listDocuments().then((docRefs) => docRefs))
            .map((docRef) => transaction.get(docRef).then((docSnap) => docSnap)))
        ).reduce((acc, docSnap) => ({...acc, ...{[docSnap.id]: docSnap}}), {});

        // read task timeOfDay
        // there can be new timesOfDay that not exists in firebase
        const dataTaskDocSnapsTimeOfDayPromise: Promise<DocumentSnapshot[]> = (Promise.all((task.timesOfDay).map((timeOfDay) =>
          currentTimesOfDay[timeOfDay] ? currentTimesOfDay[timeOfDay] : transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay)).then((docSnap) => docSnap)
        )));

        // read taskDocSnap timeOfDay
        const taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot} = {}
        taskDocSnap.data() && (taskDocSnap.data() as ITask).timesOfDay.forEach((timeOfDay) => {
          if (currentTimesOfDay[timeOfDay]) {
            taskDocSnapsTimesOfDay[timeOfDay] = currentTimesOfDay[timeOfDay];
          } else {
            console.error({
              'info': 'task not contains time of day'
            });
            throw new HttpsError(
              'invalid-argument',
              `Known task ${taskDocSnap.ref.path} not contains time of day ${timeOfDay}`,
              'Some went wrong 🤫 Try again 🙂'
            );
          }
        });

        return Promise.all([todayTaskDocSnapsPromise, dataTaskDocSnapsTimeOfDayPromise]).then((snapArray) => {

          /*
          * Proceed all data
          * */

          const todayTaskDocSnaps: { docSnap: DocumentSnapshot, day: Day }[] = snapArray[0];
          const dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot} = snapArray[1].reduce((acc, docSnap) => ({...acc, ...{[docSnap.id]: docSnap}}), {});

          const modifiedTimesOfDays = proceedTimesOfDay(transaction, taskDocSnap, userDocSnap.ref, taskDocSnapsTimesOfDay, dataTaskDocSnapsTimeOfDay);
          const timesOfDaysToStoreLen = Object.keys(currentTimesOfDay).filter((docSnapId) => !modifiedTimesOfDays.removedTimesOfDay.includes(docSnapId))
            .concat(modifiedTimesOfDays.addedTimesOfDay).length;
          if (timesOfDaysToStoreLen > 20) {
            throw new HttpsError(
              'invalid-argument',
              'Bad Request',
              `You can own 20 times of day but merge has ${timesOfDaysToStoreLen} 🤔`
            );
          }

          // proceedEveryDay
          todayTaskDocSnaps.forEach((todayTaskDocSnap) =>
            proceedTodayTask(transaction, todayTaskDocSnap.docSnap, task, todayTaskDocSnap.day)
          );

          // update task
          transaction.set(taskDocSnap.ref, task);

          // delete taskDocSnapTmp if created
          if (created) {
            transaction.delete(taskDocSnapTmp.ref);
          }

          return transaction;

        });

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
