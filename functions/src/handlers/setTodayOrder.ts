import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function listEqual
 * Check if two list are the same
 * @param A T[]
 * @param B T[]
 * @return boolean
 **/
const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every((a) => B.includes(a)) && B.every((b) => A.includes(b));


/**
 * @function handler
 * MAX[20] reads
 * MAX[20] writes
 * Read all user data about task and remove it
 * @param data: string[]
 * @param context functions.https.CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

  /*
  * Check if data is correct and user is authenticated
  * */

  if (
    !context.auth ||
    !data ||
    !Array.isArray(data) ||
    data.length > 20 ||
    data.length === 0 ||
    (new Set(data).size !== data.length) ||
    data.some((timeOfDay) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0)
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

  return app.runTransaction(async (transaction) =>
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
      const timesOfDayDocSnaps: { [timeOfDay: string]: DocumentReference } = await userDocSnap.ref.collection('timesOfDay')
        .listDocuments()
        .then(async (docsRef) =>
          (await Promise.all(docsRef.map((docRef) =>
            transaction.get(docRef).then((docSnap) => docSnap)
          ))).reduce((acc, curr) => ({...acc, ...{[curr.id]: curr.ref}}), {}));

      /*
      * Proceed all data
      * */

      const timesOfDayDocSnapsKeys = Object.keys(timesOfDayDocSnaps);
      if (timesOfDayDocSnapsKeys.length !== data.length || !listEqual(timesOfDayDocSnapsKeys, data)) {
        throw new HttpsError(
          'invalid-argument',
          'Bad Request',
          'Some went wrong 🤫 Try again 🙂'
        );
      }

      data.forEach((timeOfDay: string, index) =>
        transaction.update(timesOfDayDocSnaps[timeOfDay], {
          position: index
        })
      );

      return transaction;

    })
  ).then(() => ({
    details: 'Order has been updated 🙃'
  })).catch((error: HttpsError) => {
    if (typeof error.details !== 'string') {
      console.log(error);
    }
    throw new HttpsError(
      error.code,
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
