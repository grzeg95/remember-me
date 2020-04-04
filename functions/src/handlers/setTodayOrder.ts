import {app} from '../index';

import {
  CallableContext,
  HttpsError} from 'firebase-functions/lib/providers/https';

import {
  DocumentSnapshot,
  DocumentData} from "@google-cloud/firestore";

/**
 * @function handler
 * 1 + MAX[20] reads
 * MAX[20] writes
 * Read all user data about task and remove it
 * @param data: string[]
 * @param context functions.https.CallableContext
 * @return Promise<any>
 **/
export const handler = (data: any, context: CallableContext): Promise<any> => {

  /*
  * Check if data is correct and user is authenticated
  * */
  if (
    !data ||
    !Array.isArray(data) ||
    data.some((timeOfDay) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0) ||
    (new Set(data).size !== data.length) ||
    data.length > 20 ||
    !context.auth
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

      /*
      * Read all data
      * */

      // read all times of day
      const timesOfDayDocSnaps = await userDocSnap.ref.collection('timesOfDay').listDocuments().then(async (docsRef) => {
        const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot<DocumentData>>[] = [];
        docsRef.forEach((docRef) => {
          timesOfDayDocSnapsPromise.push(transaction.get(docRef).then((docSnap) => docSnap));
        });
        return await Promise.all(timesOfDayDocSnapsPromise);
      });

      /*
      * Proceed all data
      * */

      if (timesOfDayDocSnaps.length !== data.length) {
        throw new HttpsError(
          'invalid-argument',
          'Bad Request',
          'Some went wrong 🤫 Try again 🙂'
        );
      }

      data.forEach((timeOfDay: string, index) => {

        const timesOfDayDocSnap = timesOfDayDocSnaps.find((timesOfDayDocSnapNext) => timesOfDayDocSnapNext.data()?.name === timeOfDay);

        if (!timesOfDayDocSnap) {
          throw new HttpsError(
            'invalid-argument',
            'Bad Request',
            'Some went wrong 🤫 Try again 🙂'
          );
        }

        transaction.update(timesOfDayDocSnap.ref, {
          position: index
        });

      });

    })).then(() => ({
      details: 'Order has been updated 🙃'
    })
  ).catch((error: HttpsError) => {
    throw new HttpsError(
      'internal',
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
