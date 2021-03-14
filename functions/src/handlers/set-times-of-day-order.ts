import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../helpers/test-requirement';
import {getUser} from '../helpers/user';

const app = firestore();

/**
 * @function handler
 * Set times of day order
 * @param data: { dir: -1 or 1, [is, was]: not empty string and trim().length === length, was !== is }
 * @param context CallableContext
 * @return Promise<{ [key: string]: string }>
 **/
export const handler = async (data: any, context: CallableContext) => {

  // not logged in
  testRequirement(!context.auth, 'Please login in');

  // data
  testRequirement(
    data === null || !Array.isArray(data) || data.length !== 2 ||
    typeof data[0] !== 'string' || data[0].length === 0 || !Number.isInteger(data[1]) || data[1] === 0,
    'data is incorrect'
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const timeOfDay = data[0];
    const moveBy = data[1];
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    const timesOfDay: string[] = userDocSnap.data()?.timesOfDay || [];
    const timesOfDayCardinality: number[] = userDocSnap.data()?.timesOfDayCardinality || [];
    const toMoveIndex = timesOfDay.indexOf(timeOfDay);

    testRequirement(toMoveIndex === -1, 'time of day not exists');

    if (moveBy > 0) {
      testRequirement(toMoveIndex + moveBy >= timesOfDay.length, 'out of array +');
    }

    if (moveBy < 0) {
      testRequirement(toMoveIndex + moveBy < 0, 'out of array -');
    }

    timesOfDay.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    const userDataUpdate = {timesOfDay, timesOfDayCardinality};

    if (userDocSnap.exists) {
      transaction.update(userDocSnap.ref, userDataUpdate);
    } else {
      transaction.create(userDocSnap.ref, userDataUpdate);
    }

    return transaction;

  }).then(() => ({
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
