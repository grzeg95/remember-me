import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference, DocumentSnapshot} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function handler
 * MAX[20] reads
 * MAX[20] writes
 * Read all user data about task and remove it
 * @param data: string[]
 * @param context functions.https.CallableContext
 * @return Promise<any>
 **/
export const handler = (data: any, context: CallableContext): Promise<{ [key: string]: string }> => {

  /*
  * Check if data is correct and user is authenticated
  * */
  if (
    !context.auth ||
    !Array.isArray(data) ||
    (new Set(data).size !== data.length) ||
    data.length > 20 ||
    data.length === 0 ||
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

  return app.runTransaction(async (transaction) => {

    /*
    * Read all data
    * */

    // read all times of day
    const timesOfDayDocSnaps: { [timeOfDay: string]: DocumentReference } = await app.collection('users').doc(auth.uid).collection('timesOfDay').listDocuments().then(async (docsRef) => {
      const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot>[] = [];

      for (const docRef of docsRef) {
        timesOfDayDocSnapsPromise.push(transaction.get(docRef).then((docSnap) => docSnap))
      }

      return (await Promise.all(timesOfDayDocSnapsPromise)).reduce((acc, curr) => {
        const next = JSON.parse(`{"${curr.data()?.name}": null}`);
        next[curr.data()?.name] = curr.ref;
        return {...acc, ...next};
      }, {});
    });

    /*
    * Proceed all data
    * */

    if (Object.keys(timesOfDayDocSnaps).length !== data.length) {
      throw new HttpsError(
        'invalid-argument',
        'Bad Request',
        'Some went wrong 🤫 Try again 🙂'
      );
    }

    for (const [index, timeOfDay] of data.entries()) {
      transaction.update(timesOfDayDocSnaps[timeOfDay], {
        position: index
      })
    }

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  })).catch((error: HttpsError) => {
    throw new HttpsError(
      'internal',
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
