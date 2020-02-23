import {Transaction} from "@google-cloud/firestore";
import * as functions from 'firebase-functions';
import {db} from '../index';
import {ITask} from '../interfaces';
import {Task} from '../models';
import DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;

export const proceedNextTaskDocSnap = (transaction: Transaction, taskDocSnap: DocumentSnapshot, task: ITask, day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'): Transaction => {

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

export const saveTaskTransaction = async (transaction: Transaction, taskDocSnap: FirebaseFirestore.DocumentSnapshot, user: FirebaseFirestore.DocumentReference, task: ITask): Promise<Transaction> => {
  // set or update task for user/{userId}/task/{taskId}
  // set or update task for user/{userId}/today/{day}/task/{taskId}

  return Promise.all([
    transaction.get(user.collection('today').doc('mon').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'mon' }}),
    transaction.get(user.collection('today').doc('tue').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'tue' }}),
    transaction.get(user.collection('today').doc('wed').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'wed' }}),
    transaction.get(user.collection('today').doc('thu').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'thu' }}),
    transaction.get(user.collection('today').doc('fri').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'fri' }}),
    transaction.get(user.collection('today').doc('sat').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'sat' }}),
    transaction.get(user.collection('today').doc('sun').collection('task').doc(taskDocSnap.id)).then((docSnap) => { return { docSnap, name: 'sun' }})
  ]).then((arr) => {
    arr.forEach((element) =>
      proceedNextTaskDocSnap(transaction, element.docSnap, task, element.name as 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' )
    );
    return transaction.set(taskDocSnap.ref, task);
  });

};

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
            return saveTaskTransaction(transaction, newTaskSnap, userDoc.ref, task);
          });
        } else {
          return saveTaskTransaction(transaction, taskSnap, userDoc.ref, task);
        }

      });

    })
  ).then(() => {
    if (created) {
      return {
        code: 201,
        status: 'Created',
        created: true,
        message: 'Your task has been created',
        taskId: taskId
      };
    } else {
      return {
        code: 202,
        status: 'Accepted',
        message: 'Your task has been updated'
      };
    }
  }).catch((e) => {
      throw new functions.https.HttpsError(
        'internal',
        e,
        'Your task has not been touched'
      );
    }
  );

};
