import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../helpers/test-requirement';
import DocumentReference = firestore.DocumentReference;
import '../../../global.prototype';

const app = firestore();

/**
 * @function handler
 * Set times of day order
 * @param timesOfDays: string[]
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (timesOfDays: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // not logged in
  testRequirement(!context.auth);

  // timesOfDays is not an array
  testRequirement(!Array.isArray(timesOfDays));

  // timesOfDays.length is not in [1, 20]
  testRequirement(timesOfDays.length > 20 || timesOfDays.length === 0);

  // timesOfDays contains duplicates
  testRequirement(new Set(timesOfDays).size !== timesOfDays.length);

  const timesOfDaysTrim: string[] = timesOfDays.map((timeOfDay: any) => {

    // data.task.timesOfDay contains other than string
    testRequirement(typeof timeOfDay !== 'string');

    const timeOfDayTrim = (timeOfDay as string).trim();

    // data.task.timesOfDay contains string that trim is not in [1, 20]
    testRequirement(timeOfDayTrim.length === 0 || timeOfDayTrim.length > 20);

    // data.task.timesOfDay contains string that trim contains /
    testRequirement(timeOfDayTrim.includes('/'));

    return timeOfDayTrim;
  });

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      const userData = userDocSnap.data();
      const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

      if (isDisabled) {
        throw new HttpsError(
          'permission-denied',
          'This account is disabled',
          'Contact administrator to resolve this problem'
        );
      }

      /*
      * Read all data
      * */

      // read all times of day
      const timesOfDayDocSnaps = await userDocSnap.ref.collection('timesOfDay')
        .listDocuments()
        .then(async (docsRef) =>
          (await Promise.all(docsRef.map((docRef) =>
            transaction.get(docRef).then((docSnap) => docSnap)
          ))).reduce<{ [timeOfDay: string]: DocumentReference }>((acc, curr) => {
            Object.assign(acc, {[curr.id]: curr.ref});
            return acc;
          }, {}));

      /*
      * Proceed all data
      * */

      const timesOfDayDocSnapsKeys = Object.keys(timesOfDayDocSnaps).toSet();
      if (!timesOfDayDocSnapsKeys.hasOnly(timesOfDaysTrim.toSet())) {
        throw new HttpsError(
          'invalid-argument',
          'Bad Request',
          'Some went wrong 🤫 Try again 🙂'
        );
      }

      timesOfDaysTrim.forEach((timeOfDay: string, index) =>
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
