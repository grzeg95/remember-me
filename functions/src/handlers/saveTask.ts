import {Transaction} from "@google-cloud/firestore";
import * as functions from 'firebase-functions';
import {db} from '../index';
import {ITask} from '../interfaces';
import {Task} from '../models';
import DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;

/**
 * @type day: Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * 1 delete or 1 write
 * Save new task for every day and then prepare today's tasks
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
    if (task.timesOfDay.duringTheDay) {
      timesOfDay.duringTheDay = false;
    } else {
      for (const time in task.timesOfDay) {
        if (task.timesOfDay.hasOwnProperty(time) && task.timesOfDay[time]) {
          timesOfDay[time] = false;
        }
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
 * Save new task for every day and then prepare today's tasks
 * @param transaction Transaction
 * @param taskDocSnap FirebaseFirestore.DocumentSnapshot
 * @param oldTaskDocSnap FirebaseFirestore.DocumentSnapshot | null
 * @param user: FirebaseFirestore.DocumentReference
 * @param task: ITask
 * @return Promise<T>
 **/
const proceedAllDays = (transaction: Transaction, taskDocSnap: FirebaseFirestore.DocumentSnapshot, oldTaskDocSnap: FirebaseFirestore.DocumentSnapshot | null, user: FirebaseFirestore.DocumentReference, task: ITask): Promise<Transaction> => {
  // set or update task for user/{userId}/task/{taskId}
  // set or update task for user/{userId}/today/{day}/task/{taskId}

  const reads: Promise<{docSnap: FirebaseFirestore.DocumentSnapshot, day: Day}>[] = [];

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
 * 3 reads
 * Save new task
 * @param data any
 * @param context functions.https.CallableContext
 * @return Promise<T>
 **/
export const handler = (data: any, context: functions.https.CallableContext) => {

  const auth = context.auth;

  if (!data.task || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  const task: ITask = data.task;

  if (!(data.taskId && typeof data.taskId === 'string')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  let taskId = data.taskId;

  // TASK VALIDATION
  if (!Task.isValid(task)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  let created = false;

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth.uid)).then(userDoc => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      return transaction.get(userDoc.ref.collection('task').doc(taskId)).then((taskSnap) => {

        if (!taskSnap.exists) {
          created = true;
          return transaction.get(userDoc.ref.collection('task').doc()).then((newTaskSnap) => {
            taskId = newTaskSnap.id;
            return proceedAllDays(transaction, newTaskSnap, taskSnap, userDoc.ref, task);
          });
        } else {
          return proceedAllDays(transaction, taskSnap, null, userDoc.ref, task);
        }

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
