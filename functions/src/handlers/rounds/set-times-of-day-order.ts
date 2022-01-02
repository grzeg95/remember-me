import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';

const app = firestore();

/**
 * @function handler
 * Set times of day order
 * @param data {
 *     roundId: string;
 *     timeOfDay: string;
 *     moveBy: number
 * }
 * @param context CallableContext
 * @return Promise<{ [key: string]: string }>
 **/
export const handler = async (data: any, context: CallableContext) => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 3 keys
  testRequirement(dataKeys.length !== 3);

  // data has not 'task', 'taskId', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['moveBy', 'timeOfDay', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.timeOfDay is not empty string
  testRequirement(typeof data.timeOfDay !== 'string' || data.timeOfDay.length === 0);

  // data.moveBy is integer without 0
  testRequirement(!Number.isInteger(data.moveBy) || data.moveBy === 0);

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const timeOfDay = data.timeOfDay;
    const roundId = data.roundId;
    const moveBy = data.moveBy;
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const timesOfDayDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if timeOfDay exists
    testRequirement(!timesOfDayDocSnap.exists);

    const timesOfDayDocSnapData = timesOfDayDocSnap.data();
    const timesOfDay: string[] = timesOfDayDocSnapData?.timesOfDay || [];
    const timesOfDayCardinality: number[] = timesOfDayDocSnapData?.timesOfDayCardinality || [];
    const toMoveIndex = timesOfDay.indexOf(timeOfDay);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= timesOfDay.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    timesOfDay.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    const timesOfDayDataToWrite = {timesOfDay, timesOfDayCardinality};
    transaction.update(timesOfDayDocSnap.ref, timesOfDayDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
