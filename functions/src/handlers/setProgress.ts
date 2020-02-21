import * as functions from 'firebase-functions';
import {db} from '../index';
import {Task} from './task';

export const handler = (data: any, context: functions.https.CallableContext) => {

  const auth = context.auth;

  if (!(data.taskId && typeof data.taskId === 'string' &&
    data.todayName && typeof data.todayName === 'string' && Task.daysOfTheWeek.includes(data.todayName) &&
    data.timeOfDay && typeof data.timeOfDay === 'string' && Task.timesOfDay.includes(data.timeOfDay) &&
    data.hasOwnProperty('checked') && typeof data.checked === 'boolean') || !auth) {
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

      return transaction.get(userDoc.ref.collection('today').doc(data.todayName).collection('task').doc(data.taskId)).then((todayTaskSnap) => {
        const toUpdateOneTimeOfDay = {
          timesOfDay: JSON.parse('{"' + data.timeOfDay + '":' + data.checked + '}')
        };
        return transaction.set(todayTaskSnap.ref, toUpdateOneTimeOfDay, {merge: true});
      });

    })).then(() => {
    return {
      message: 'Your progress has been updated'
    };
  }).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been deleted'
    );
  });

};
