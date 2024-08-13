import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {Round} from '../../models/round';
import '../../utils/global.prototype';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const app = getFirestore();

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

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);
    const timeOfDayId = data.timeOfDayId;
    const roundId = data.roundId;
    const moveBy = data.moveBy;

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    const roundRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnap = await transaction.get(roundRef);
    const roundData = await Round.data(roundDocSnap, cryptoKey);

    // check if timeOfDay exists
    testRequirement(!roundDocSnap.exists);

    const timesOfDayIds = roundData.timesOfDayIds;
    const timesOfDayCardinality = roundData.timesOfDayIdsCardinality;
    const toMoveIndex = timesOfDayIds.indexOf(timeOfDayId);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= timesOfDayIds.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    timesOfDayIds.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    const encryptedName = await encrypt(roundData.name, cryptoKey);
    transactionWrite.update(roundDocSnap.ref, {
      encryptedName: encryptedName,
      timesOfDayIds,
      timesOfDayCardinality,
      todayIds: roundData.todayIds,
      tasksIds: roundData.tasksIds
    });

    return transactionWrite.execute();

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));
};
