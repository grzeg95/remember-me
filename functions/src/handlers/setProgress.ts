import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';
import {Task} from '../models';

export const handler = (data: any, context: functions.https.CallableContext) => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  if (
    !data.taskId || typeof data.taskId !== 'string' ||
    !data.todayName || typeof data.todayName !== 'string' || !Task.daysOfTheWeek.includes(data.todayName) ||
    !data.hasOwnProperty('checked') || typeof data.checked !== 'boolean' ||
    !auth
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

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

      return transaction.get(userDoc.ref.collection('today').doc(`${data.todayName}/task/${data.taskId}`)).then((todayTaskSnap) => {

        // interrupt if there is no task to update
        if (!todayTaskSnap.exists) {
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
