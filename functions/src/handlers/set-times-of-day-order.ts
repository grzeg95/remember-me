import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference} from "@google-cloud/firestore";
import {keysEqual} from '../helpers/keys-equal';
import {testRequirement} from '../helpers/test-requirement';

const app = firestore();

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

  testRequirement(
    "not logged in",
    !context.auth
  );

  testRequirement(
    "data does not exists",
    !data,
    data
  );

  testRequirement(
    "data is not an array",
    !Array.isArray(data),
    data
  );

  testRequirement(
    "data.length is not in [1, 20]",
    data.length > 20 || data.length === 0,
    data
  );

  testRequirement(
    "data contains duplicates",
    (new Set(data).size !== data.length),
    data
  );

  testRequirement(
    "data contains not string, trim is not in [1, 20] or contains /",
    data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.trim().length > 20 || timeOfDay.trim().length === 0),
    data
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

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
        console.error({
          'info': 'user tried to update different times of day than has'
        });
        throw new HttpsError(
          'invalid-argument',
          'Bad Request',
          'Some went wrong 🤫 Try again 🙂'
        );
      }

      (data as string[]).forEach((timeOfDay: string, index) =>
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
