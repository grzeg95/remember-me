import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';

/**
 * 3 reads, 1 write
 * Try to set progress of today task by time of day
 * @param data any
 * @param context functions.https.CallableContext
 * @return Promise<T>
 **/
export const handler = (data: { taskId: any, todayName: any, checked: any, timeOfDay: any }, context: functions.https.CallableContext) => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  if (
    !data.taskId || typeof data.taskId !== 'string' ||
    !data.todayName || typeof data.todayName !== 'string' || !['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(data.todayName) ||
    !data.hasOwnProperty('checked') ||
    !data.timeOfDay || typeof data.timeOfDay !== 'string'
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth?.uid as string)).then((userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `User ${auth?.uid} does not exist`
        );
      }

      return transaction.get(userDocSnap.ref.collection('today').doc(`${data.todayName}/task/${data.taskId}`)).then((todayTaskDocSnap) => {

        // interrupt if user has not this task
        if (!todayTaskDocSnap.exists) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Task does not exist',
            `User ${userDocSnap.data()?.id} has not task ${data.todayName}/task/${data.taskId}`
          );
        }

        return transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then((taskDocSnap) => {

          // interrupt if user has not this task
          if (!taskDocSnap.exists) {
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Task does not exist',
              `User ${userDocSnap.data()?.id} has not task ${data.taskId}`
            );
          }

          if (!(taskDocSnap.data()?.timesOfDay as Object).hasOwnProperty(data.timeOfDay)) {
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Invalid time of day',
              `User ${userDocSnap.data()?.id} has not task ${data.taskId} with ${data.timeOfDay}`
            );
          }

          return transaction.set(todayTaskDocSnap.ref, {
            timesOfDay: JSON.parse(`{"${data.timeOfDay}":${data.checked}}`)
          }, {merge: true});

        });

      });

    })).then(() => ({
      message: 'Your progress has been updated'
    })).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been updated'
    );
  });

};
