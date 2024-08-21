import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import '../../utils/global.prototype';
import {Round, RoundDocUncrypded} from '../../models/round';
import {encryptRound, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const firestore = getFirestore();

/**
 * Set times of day order
 * @function handler
 * @param {CallableRequest} request
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!auth || (!auth?.token.email_verified &&
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

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);
    const timeOfDay = data.timeOfDay;
    const roundId = data.roundId;
    const moveBy = data.moveBy;

    const userDocSnap = await getUserDocSnap(firestore, transaction, auth?.uid as string);

    const roundRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnap = await transaction.get(roundRef);

    // check if timeOfDay exists
    testRequirement(!roundDocSnap.exists);

    const round = await Round.data(roundDocSnap, cryptoKey);

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
    } as RoundDocUncrypded, cryptoKey));

    return transactionWrite.execute();
  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));
};
