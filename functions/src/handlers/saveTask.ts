import {DocumentReference, DocumentSnapshot, Transaction} from '@google-cloud/firestore';
import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';

const app = firestore();

/**
 * @type Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @interface ITask
 **/
interface ITask {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  }
}

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
 * @function listEqual
 * Check if two list are the same
 * @param A T[]
 * @param B T[]
 * @return boolean
 **/
const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every((a) => B.includes(a)) && B.every((b) => A.includes(b));

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
}

/**
 * @function proceedTodayTask
 * 1 delete or 1 write
 * Prepare today tasks
 * @param transaction Transaction
 * @param todayTaskDocSnap DocumentSnapshot
 * @param task: ITask
 * @param day: Day
 * @return Transaction
 **/
const proceedTodayTask = (transaction: Transaction, todayTaskDocSnap: DocumentSnapshot, task: ITask, day: Day): Transaction => {

  if (!todayTaskDocSnap.exists && task.daysOfTheWeek[day]) { // set
    // add task timesOfDay
    const timesOfDay: {
      [key: string]: boolean;
    } = {};

    task.timesOfDay.forEach((timeOfDay) => timesOfDay[timeOfDay.trim()] = false);

    return transaction.set(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if (todayTaskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
    return transaction.delete(todayTaskDocSnap.ref);
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

    return transaction.update(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    return transaction.delete(todayTaskDocSnap.ref);
  }

};

/**
 * @function proceedTimesOfDay
 * MAX[20] writes and deletes
 * Update times of day
 * @param transaction Transaction
 * @param taskDocSnap DocumentSnapshot
 * @param user: DocumentReference
 * @param taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot}
 * @param dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot}
 * @return Transaction
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
 * 10 + MAX[20] reads
 * 1 delete
 * 1 update
 * Save new task
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
 * @return Promise<{[key: string]: string | boolean}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{ created: boolean; details: string; taskId: string }> => {

  let dataKeys;
  let dataTaskKeys;
  let dataTaskDaysOfTheWeekKeys;

  if (
    !context.auth ||

    // data includes task: object and taskId: string
    typeof data !== 'object' ||
    (dataKeys = Object.keys(data)).length !== 2 ||
    !listEqual(dataKeys, ['task', 'taskId']) ||
    typeof data.taskId !== 'string' ||
    typeof data.task !== 'object' ||

    // task includes description:string[4,40],
    // daysOfTheWeek:{ all mon,tue,wed,thu,fri,sat,sun that are booleans},
    // timesOfDay: {[key: string]: string}
    (dataTaskKeys = Object.keys(data.task)).length !== 3 ||
    !listEqual(dataTaskKeys, ['description', 'daysOfTheWeek', 'timesOfDay']) ||
    typeof data.task.description !== 'string' || data.task.description.length <= 3 || data.task.description.length > 40 || // description length must be between 4 add 40
    (dataTaskDaysOfTheWeekKeys = Object.keys(data.task.daysOfTheWeek)).length !== 7 || // 7 days in week
    !listEqual(dataTaskDaysOfTheWeekKeys, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) || // mon, tue, wed, thu, fri, sat, sun ...
    dataTaskDaysOfTheWeekKeys.some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean') || // ... task.daysOfTheWeek must contains booleans properties and ...
    !dataTaskDaysOfTheWeekKeys.some((e) => data.task.daysOfTheWeek[e as Day]) || // ... some true

    // timesOfDay in object based on string array 20 len with values 1 to 20 len
    !Array.isArray(data.task.timesOfDay) ||
    data.task.timesOfDay.length === 0 ||
    data.task.timesOfDay.length > 20 ||
    new Set(data.task.timesOfDay).size !== data.task.timesOfDay.length ||
    data.task.timesOfDay.some((e: any) => typeof e !== 'string' || e.trim().length < 1 || e.trim().length > 20) // ... timesOfDay length must be between 1 add 20
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }

  const auth: {
    uid: string;
  } = context.auth;

  let created = false;
  let taskId: string = data.taskId;

  return app.runTransaction((transaction) =>
    transaction.get(app.collection('users').doc(auth.uid)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `You dont't exist 😱`
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(taskId)).then(async (taskDocSnapTmp) => {

        let diff: ITaskDiff;
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
          * Check if only description was changed
          * */

          diff = taskDiff((taskDocSnap.data() as ITask), task);

          if (
            diff.description.type === 'changed' &&
            !daysOfTheWeekChanged(diff) &&
            diff.timesOfDay.new.length === 0 &&
            diff.timesOfDay.removed.length === 0) {

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
              if (todayTask.exists) {
                transaction.update(todayTask.ref, {
                  description: task.description
                })
              }
            });

            transaction.update(taskDocSnap.ref, {
              description: task.description
            });

            return transaction;

          }

          /*
          * Check if nothing changed
          * */

          if (
            diff.description.type === 'unchanged' &&
            !daysOfTheWeekChanged(diff) &&
            diff.timesOfDay.new.length === 0 &&
            diff.timesOfDay.removed.length === 0) {

            transaction.update(taskDocSnap.ref, task);
            return transaction;
          }

        }

        // read all task for user/{userId}/today/{day}/task/{taskId}
        // Promise<{ docSnap: DocumentSnapshot, day: Day }>[] = [];
        const todayTaskDocSnaps = await Promise.all((['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[])
          .map((day) =>
            transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
              .then((docSnap) => ({docSnap, day}))
          )
        );

        // read current timesOfDay
        const currentTimesOfDay: {[timeOfDay: string]: DocumentSnapshot} = (
          await Promise.all((await userDocSnap.ref.collection('timesOfDay').listDocuments().then((docRefs) => docRefs))
            .map((docRef) => transaction.get(docRef).then((docSnap) => docSnap)))
        ).reduce((acc, docSnap) => ({...acc, ...{[docSnap.id]: docSnap}}), {});

        // read taskDocSnap timeOfDay
        const taskDocSnapsTimesOfDay: {[timeOfDay: string]: DocumentSnapshot} = {}
        taskDocSnap.data() && (taskDocSnap.data() as ITask).timesOfDay.forEach((timeOfDay) => {
          if (currentTimesOfDay[timeOfDay]) {
            taskDocSnapsTimesOfDay[timeOfDay] = currentTimesOfDay[timeOfDay];
          }
        });

        // read task timeOfDay
        // there can be new timesOfDay that not exists in firebase
        const dataTaskDocSnapsTimeOfDay: {[timeOfDay: string]: DocumentSnapshot} = (await Promise.all((task.timesOfDay).map((timeOfDay) => {
          if (currentTimesOfDay[timeOfDay]) {
            return currentTimesOfDay[timeOfDay];
          }
          return transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay)).then((docSnap) => docSnap)
        }))).reduce((acc, docSnap) => ({...acc, ...{[docSnap.id]: docSnap}}), {});


        /*
        * Proceed all data
        * */

        const modifiedTimesOfDays = proceedTimesOfDay(transaction, taskDocSnap, userDocSnap.ref, taskDocSnapsTimesOfDay, dataTaskDocSnapsTimeOfDay);
        const timesOfDaysToStoreLen = Object.keys(currentTimesOfDay).filter((docSnapId) => !modifiedTimesOfDays.removedTimesOfDay.includes(docSnapId))
          .concat(modifiedTimesOfDays.addedTimesOfDay).length;
        if (timesOfDaysToStoreLen > 20) {
          throw new HttpsError(
            'invalid-argument',
            'Bad Request',
            `You can own 20 times of day but merge this request with existing ones equals ${timesOfDaysToStoreLen} 🤔`
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
      throw new HttpsError(
        'internal',
        error.message,
        error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
      );
    }
  );

};
