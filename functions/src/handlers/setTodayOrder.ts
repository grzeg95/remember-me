import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';

export const handler = (data: any[], context: functions.https.CallableContext) => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  if (
    !data ||
    !Array.isArray(data) ||
    data.some((timeOfDay) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0) ||
    (new Set(data).size !== data.length) ||
    data.length > 20
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

      const userData = userDocSnap.data();
      let userTimesOfDay: {
        [name: string]: {
          position: number;
          counter: number;
        }
      } = {};
      if (userData && userData['timesOfDay']) {
        userTimesOfDay = userData['timesOfDay'];
      }

      for (let i = 0; i < data.length; ++i) {
        if (!userTimesOfDay[data[i]]) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Bad Request',
            'Check function requirements'
          );
        }
        userTimesOfDay[data[i]].position = i;
      }

      if (Object.keys(userTimesOfDay).length > 20) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Max times of day is 20',
          'Check function requirements'
        );
      }

      transaction.update(userDocSnap.ref, {
        timesOfDay: userTimesOfDay
      });

    }));

};
