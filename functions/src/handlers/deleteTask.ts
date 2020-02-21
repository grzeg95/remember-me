import * as functions from 'firebase-functions';
import {db} from '../index';
import {Task} from './task';

export const handler = (data: any, context: functions.https.CallableContext) => {

  const auth = context.auth;

  // interrupt if data.taskId is not correct or !auth
  if (!data.taskId || typeof data.taskId !== 'string' || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  const taskId = data.taskId;

  return db.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(db.collection('users').doc(auth.uid)).then((userDoc) => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      const promises: Promise<any>[] = [];

      // remove task it self
      promises.push(transaction.get(userDoc.ref.collection('task').doc(taskId)).then(taskDoc => transaction.delete(taskDoc.ref)));

      // remove all today tasks
      Task.daysOfTheWeek.forEach(dayOfTheWeek => {
        promises.push(transaction.get(userDoc.ref.collection('today').doc(dayOfTheWeek).collection('task').doc(taskId)).then((taskDayDocTask) =>
          transaction.delete(taskDayDocTask.ref)
        ));
      });

      // close all operations in the transaction
      return Promise.all(promises);

    })
  ).then(() => {
    return {
      message: 'Your task has been deleted'
    };
  }).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been deleted'
    );
  });

};
