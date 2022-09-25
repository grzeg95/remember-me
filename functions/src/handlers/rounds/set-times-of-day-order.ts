import {firestore} from 'firebase-admin';
import {Round} from '../../models';
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

const app = firestore();

/**
 * Set times of day order
 * @function handler
 * @param context Context
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

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
  let roundDocSnap: firestore.DocumentSnapshot;
  let round: Round;

  return getCryptoKey(context.auth?.token.secretKey).then((_cryptoKey) => {
    cryptoKey = _cryptoKey;

    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);
      const timeOfDay = data.timeOfDay;
      const roundId = data.roundId;
      const moveBy = data.moveBy;

      return getUserDocSnap(app, transaction, auth?.uid as string).then((userDocSnap) => {
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
      code: 200,
      body: {
        details: 'Order has been updated 🙃'
      }
    }));
  });
};
