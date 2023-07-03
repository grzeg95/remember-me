import {getFirestore} from 'firebase-admin/firestore';
import {
  Context,
  decryptRound,
  encryptRound,
  FunctionResultPromise,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite
} from '../../tools';

import '../../tools/global.prototype';

const app = getFirestore();

/**
 * Set times of day order
 * @function handler
 * @param context Context
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!context.app || !auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

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

  const cryptoKey = await getCryptoKey(context.auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);
    const timeOfDay = data.timeOfDay;
    const roundId = data.roundId;
    const moveBy = data.moveBy;

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if timeOfDay exists
    testRequirement(!roundDocSnap.exists);

    const round = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);

    const timesOfDay = round.timesOfDay;
    const timesOfDayCardinality = round.timesOfDayCardinality;
    const toMoveIndex = timesOfDay.indexOf(timeOfDay);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= timesOfDay.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    timesOfDay.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    transactionWrite.update(roundDocSnap.ref, encryptRound({
      timesOfDay,
      timesOfDayCardinality,
      name: round.name,
      todaysIds: round.todaysIds,
      tasksIds: round.tasksIds
    }, cryptoKey));

    return transactionWrite.execute();
  }).then(() => ({
    code: 200,
    body: {
      details: 'Order has been updated 🙃'
    }
  }));
};
