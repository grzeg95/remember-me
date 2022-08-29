import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {FunctionResult, Round} from '../../helpers/models';
import {decryptRound, encryptRound, getCryptoKey} from '../../helpers/security';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from '../../helpers/transaction-write';
import {getUser} from '../../helpers/user';

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
 * @param {CallableContext} callableContext
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = (data: any, callableContext: CallableContext): FunctionResult => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

  // email not verified, not for anonymous
  testRequirement(
    !auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous
  );

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

  testRequirement(!auth?.token.secretKey);

  let cryptoKey: CryptoKey;
  let userDocSnap: firestore.DocumentSnapshot;
  let roundDocSnap: firestore.DocumentSnapshot;
  let round: Round;

  return getCryptoKey(callableContext.auth?.token.secretKey).then((_cryptoKey) => {
    cryptoKey = _cryptoKey;

    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);
      const timeOfDay = data.timeOfDay;
      const roundId = data.roundId;
      const moveBy = data.moveBy;

      return getUser(app, transaction, auth?.uid as string).then((_userDocSnap) => {
        userDocSnap = _userDocSnap;

        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
      }).then((_roundDocSnap) => {
        roundDocSnap = _roundDocSnap;

        // check if timeOfDay exists
        testRequirement(!roundDocSnap.exists);

        return decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
      }).then((_round) => {
        round = _round;

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
      });
    }).then(() => ({
      details: 'Order has been updated 🙃'
    }));
  });
};
