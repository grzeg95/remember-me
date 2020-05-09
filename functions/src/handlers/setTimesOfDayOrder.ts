import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function buildRequirement
 * @param failed boolean
 * @param ref? any
 * @return {failed: boolean, ref?: any}
 **/
const buildRequirement = (failed: boolean, ref?: any): {failed: boolean, ref?: any} => {
  return {
    failed, ref
  };
};

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

  const requirements: {[key: string]: {failed: boolean, ref?: any}} = {
    "!context.auth":
      buildRequirement(!context.auth),

    "!data":
      buildRequirement(!data, data),

    "!Array.isArray(data)":
      buildRequirement(!Array.isArray(data), data),

    "data.length > 20":
      buildRequirement(data.length > 20, data),

    "data.length === 0":
      buildRequirement(data.length === 0, data),

    "(new Set(data).size !== data.length)":
      buildRequirement((new Set(data).size !== data.length), data),

    "data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0)":
      buildRequirement(data.some((timeOfDay: any) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0), data)

  };

  for (const requirementKey in requirements) {
    if (requirements[requirementKey].failed) {
      console.error({
        [requirementKey]: JSON.stringify(requirements[requirementKey].ref)
      });

      throw new HttpsError(
        'invalid-argument',
        'Bad Request',
        'Some went wrong 🤫 Try again 🙂'
      );
    }
  }

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

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
