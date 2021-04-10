import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../helpers/test-requirement';
import {getUser, writeUser} from '../helpers/user';

const app = firestore();

/**
 * @function handler
 * Set times of day order
 * @param data: [string, number]
 * @param context CallableContext
 * @return Promise<{ [key: string]: string }>
 **/
export const handler = async (data: any, context: CallableContext) => {

  // not logged in
  testRequirement(!context.auth);

  // data
  testRequirement(
    data === null || !Array.isArray(data) || data.length !== 2 ||
    typeof data[0] !== 'string' || data[0].length === 0 || !Number.isInteger(data[1]) || data[1] === 0
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const timeOfDay = data[0];
    const moveBy = data[1];
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    const timesOfDay: string[] = userDocSnap.data()?.timesOfDay || [];
    const timesOfDayCardinality: number[] = userDocSnap.data()?.timesOfDayCardinality || [];
    const toMoveIndex = timesOfDay.indexOf(timeOfDay);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= timesOfDay.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    timesOfDay.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    const userDataToWrite = {timesOfDay, timesOfDayCardinality};
    writeUser(transaction, userDocSnap, userDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
