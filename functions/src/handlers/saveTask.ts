import {Transaction} from "@google-cloud/firestore";
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';
import {ITask} from '../interfaces';
import {listEqual} from '../tools';
import DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;
import DocumentReference = FirebaseFirestore.DocumentReference;

/**
 * @type day: Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * 1 delete or 1 write
 * Prepare today tasks
 * @param transaction Transaction
 * @param taskDocSnap FirebaseFirestore.DocumentSnapshot
 * @param task: ITask
 * @param day: Day
 * @return Promise<T>
 **/
const proceedTask = (transaction: Transaction, taskDocSnap: DocumentSnapshot, task: ITask, day: Day): Transaction => {

  if (!taskDocSnap.exists && task.daysOfTheWeek[day]) { // set
    // add task timesOfDay
    const timesOfDay: {
      [key: string]: boolean;
    } = {};
    for (const time in task.timesOfDay) {
      if (task.timesOfDay.hasOwnProperty(time) && task.timesOfDay[time]) {
        timesOfDay[time] = false;
      }
    }
    return transaction.set(taskDocSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if(taskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
    return transaction.delete(taskDocSnap.ref);
  } else if(taskDocSnap.exists && task.daysOfTheWeek[day]) { // update

    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: {
      [key: string]: boolean;
    } = {};

    // set only used timesOfDay to newTimesOfDay
    for (const time in task.timesOfDay) {
      if (task.timesOfDay.hasOwnProperty(time) && task.timesOfDay[time]) {
        newTimesOfDay[time] = false;
      }
    }

    // store current timesOfDay to oldTimesOfDay
    let oldTimesOfDay: {
      [key: string]: boolean;
    } = {};
    const docData = taskDocSnap.data() as ITask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // set newTimesOfDay base on oldTimesOfDay
    // maybe there exist selected timesOfDay
    for (const timeOfDay in newTimesOfDay) {
      if (oldTimesOfDay[timeOfDay]) {
        newTimesOfDay[timeOfDay] = oldTimesOfDay[timeOfDay];
      }
    }

    return transaction.update(taskDocSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    return transaction.delete(taskDocSnap.ref);
  }

};

/**
 * 7 reads, 1 write
 * Save new task for every day
 * @param transaction Transaction
 * @param taskDocSnap FirebaseFirestore.DocumentSnapshot
 * @param oldTaskDocSnap FirebaseFirestore.DocumentSnapshot | null
 * @param user: FirebaseFirestore.DocumentReference
 * @param task: ITask
 * @return Promise<Transaction>
 **/
const proceedEveryDay = (transaction: Transaction, taskDocSnap: DocumentSnapshot, oldTaskDocSnap: DocumentSnapshot | null, user: DocumentReference, task: ITask): Promise<Transaction> => {
  // set or update task for user/{userId}/task/{taskId}
  // set or update task for user/{userId}/today/{day}/task/{taskId}

  const reads: Promise<{docSnap: DocumentSnapshot, day: Day}>[] = [];

  (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[]).forEach((day) => {
    reads.push(transaction.get(user.collection('today').doc(`${day}/task/${taskDocSnap.id}`)).then((docSnap) => ({ docSnap, day })));
  });

  return Promise.all(reads).then((readsReady) => {
    readsReady.forEach((readReady) =>
      proceedTask(transaction, readReady.docSnap, task, readReady.day)
    );
    oldTaskDocSnap && transaction.delete(oldTaskDocSnap.ref);
    return transaction.set(taskDocSnap.ref, task);
  });

};

/**
 * 3 reads when create
 * 2 reads when update
 * Save new task
 * @param data {
    task: {
      timesOfDay: {
        [key: string]: any
      };
      daysOfTheWeek: {
        mon: any;
        tue: any;
        wed: any;
        thu: any;
        fri: any;
        sat: any;
        sun: any;
      }
      description: any;
    }
  }
 * @param context functions.https.CallableContext
 * @return Promise<T>
 **/
export const handler = (data: {
  task: {
    timesOfDay: {
      [key: string]: any
    };
    daysOfTheWeek: {
      mon: any;
      tue: any;
      wed: any;
      thu: any;
      fri: any;
      sat: any;
      sun: any;
    }
    description: any;
  }, taskId: any}, context: functions.https.CallableContext): Promise<any> =>
{

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  const taskKes = Object.keys((data.task as Object));
  const daysOfTheWeekKeys = Object.keys((data.task.daysOfTheWeek as Object));
  const timesOfDayKeys = Object.keys((data.task.timesOfDay as Object));

  if (
    !data.task || !data.taskId || typeof data.taskId !== 'string' ||
    taskKes.length !== 3 || // task is based on 3 objects ...
    !listEqual(taskKes, ['description','daysOfTheWeek','timesOfDay']) || // ... description, daysOfTheWeek, timesOfDay
    !data.task.description || typeof data.task.description !== 'string' || data.task.description.length <= 3 || data.task.description.length > 20 || // description length must be between 4 add 20
    daysOfTheWeekKeys.length !== 7 || // task.daysOfTheWeek is based on 7 object ...
    !listEqual(daysOfTheWeekKeys, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) || // mon, tue, wed, thu, fri, sat, sun ...
    daysOfTheWeekKeys.some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean') || // ... task.daysOfTheWeek must contains booleans properties and ...
    !daysOfTheWeekKeys.some((e) => data.task.daysOfTheWeek[e as Day]) || // ... some true
    timesOfDayKeys.length === 0 || // data.timesOfDayKeys is based on at least one object ...
    timesOfDayKeys.some((e) => typeof data.task.timesOfDay[e] !== 'boolean') || // that contain boolean property ...
    !timesOfDayKeys.some((e) => data.task.timesOfDay[e]) || // ... that one is true and ...
    timesOfDayKeys.some((e) => e.trim().length < 1 || e.trim().length > 20) // ... timesOfDay length must be between 1 add 20
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  let created = false;
  let taskId = data.taskId;

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `User ${auth?.uid} does not exist`
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(taskId)).then(async (taskDocSnap) => {

        const userDocSnapData = userDocSnap.data();
        let userTimesOfDay: {
          [name: string]: {
            position: number,
            counter: number
          }
        } = {};

        if (userDocSnapData && userDocSnapData['timesOfDay']) {
          userTimesOfDay = userDocSnapData['timesOfDay'];
        }

        const taskDocSnapData = taskDocSnap.data();
        let currentTimesOfDay: {
          [name: string]: boolean
        } = {};

        if (taskDocSnapData && taskDocSnapData['timesOfDay']) {
          currentTimesOfDay = taskDocSnapData['timesOfDay'];
        }

        const currentTimesOfDayKeys: string[] = Object.keys(currentTimesOfDay);

        const toRemove: string[] = [];
        currentTimesOfDayKeys.forEach((e) => {
          if (timesOfDayKeys.indexOf(e) === -1) {
            toRemove.push(e);
          }
        });
        toRemove.forEach(i => {
          if (userTimesOfDay[i]) {
            userTimesOfDay[i].counter--;
            if (userTimesOfDay[i].counter <= 0) {
              delete userTimesOfDay[i];
            }
          }
        });

        const toAdd: string[] = [];
        timesOfDayKeys.forEach((e) => {
          if (currentTimesOfDayKeys.indexOf(e) === -1) {
            toAdd.push(e);
          }
        });

        toAdd.forEach(i => {
          if (userTimesOfDay[i]) {
            userTimesOfDay[i].counter++;
          } else {
            userTimesOfDay[i] = {
              position: 0,
              counter: 1
            }
          }
        });

        /*
        * WAIT FOR MESSAGE
        * */

        let message;

        if (!taskDocSnap.exists) {
          created = true;
          message = transaction.get(userDocSnap.ref.collection('task').doc()).then((newTaskSnap) => {
            taskId = newTaskSnap.id;
            return proceedEveryDay(transaction, newTaskSnap, taskDocSnap, userDocSnap.ref, data.task);
          });
        } else {
          message = proceedEveryDay(transaction, taskDocSnap, null, userDocSnap.ref, data.task);
        }

        await message;
        /*
        * WAIT FOR MESSAGE DONE
        * */

        transaction.update(userDocSnap.ref, {
          timesOfDay: userTimesOfDay
        });

      });

    })
  ).then(() =>
    created ? ({
      status: 'Created',
      created: true,
      message: 'Your task has been created',
      taskId: taskId
    }) : ({
      status: 'Updated',
      created: false,
      message: 'Your task has been updated',
      taskId: taskId
    })
  ).catch((e) => {
      throw new functions.https.HttpsError(
        'internal',
        e,
        'Your task has not been touched'
      );
    }
  );

};
