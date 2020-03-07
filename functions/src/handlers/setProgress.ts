import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';
import {Task} from '../models';

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
    !data.todayName || typeof data.todayName !== 'string' || !Task.daysOfTheWeek.includes(data.todayName) ||
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
    transaction.get(db.collection('users').doc(auth?.uid as string)).then(userDoc => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      return transaction.get(userDoc.ref.collection('today').doc(`${data.todayName}/task/${data.taskId}`)).then((todayTaskSnap) => {

        // interrupt if there is no task to update
        if (!todayTaskSnap.exists) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Bad Request',
            'Check function requirements'
          );
        }

        return transaction.get(userDoc.ref.collection('task').doc(data.taskId)).then((taskDocSnap) => {

          if (!taskDocSnap.exists || !(taskDocSnap.data()?.timesOfDay as Object).hasOwnProperty(data.timeOfDay)) {
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Bad Request',
              'Check function requirements'
            );
          }

          return transaction.set(todayTaskSnap.ref, {
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
