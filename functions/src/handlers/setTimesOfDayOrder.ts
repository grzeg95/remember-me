import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function keysEqual
 * Check if two keys lists are the same
 * @param A string[] -> A <==> Array.from(new Set(A))
 * @param B string[] -> B <==> Array.from(new Set(B))
 * @return boolean
 **/
const keysEqual = (A: string[], B: string[]): boolean => {

  if (A.length !== B.length) {
    return false;
  }

  return !A.some((a) => !B.includes(a));
};

/**
 * @function handler
 * Set times of day order
 * @param data: string[]
 * @param context CallableContext
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
    data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0)
  ) {

    const error = {
      "!context.auth": !context.auth,
      "!data": !data,
      "!Array.isArray(data)": !Array.isArray(data),
      "data.length > 20": data.length > 20,
      "data.length === 0": data.length === 0,
      "(new Set(data).size !== data.length)": (new Set(data).size !== data.length),
      "data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0)": data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0)
    };

    console.error(JSON.stringify({
      'function': 'setTimesOfDayOrder',
      data: data,
      error
    }));

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

      if (userDocSnap.data()?.blocked === true) {
        throw new HttpsError(
          'permission-denied',
          '',
          ''
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
      if (!keysEqual(timesOfDayDocSnapsKeys, data)) {
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
    const details = error.code === 'permission-denied' ? '' : error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂';
    throw new HttpsError(
      error.code,
      error.message,
      details
    );
  });

};
