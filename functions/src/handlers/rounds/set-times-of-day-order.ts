import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';
import {
  decryptRound,
  decryptSymmetricKey, encryptRound,
  getCryptoKey
} from '../../security/security';

const app = firestore();

/**
 * Set times of day order
 * @function handler
 * @param {*} data
 * {
 *  roundId: string;
 *  timeOfDay: string;
 *  moveBy: number
 * }
 * @param {CallableContext} context
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

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

  const auth: {uid: string} | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const timeOfDay = data.timeOfDay;
    const roundId = data.roundId;
    const moveBy = data.moveBy;
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if timeOfDay exists
    testRequirement(!roundDocSnap.exists);

    // get crypto key
    // TODO
    let cryptoKey: CryptoKey;
    if (context.auth?.token.decryptedSymmetricKey) {
      cryptoKey = await getCryptoKey(context.auth?.token.decryptedSymmetricKey, context.auth?.uid);
    } else {
      cryptoKey = await decryptSymmetricKey(context.auth?.token.encryptedSymmetricKey, context.auth?.uid);
    }

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
    const timesOfDayDataToWrite = await encryptRound({
      timesOfDay,
      timesOfDayCardinality,
      name: round.name,
      todaysIds: round.todaysIds,
      tasksIds: round.tasksIds
    }, cryptoKey);

    transaction.update(roundDocSnap.ref, timesOfDayDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
