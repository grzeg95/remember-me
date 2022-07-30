import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';
import {
  decrypt,
  encrypt,
  getCryptoKey
} from '../../security/security';

const app = firestore();

/**
 * Set rounds order
 * @function handler
 * @param {*} data
 * {
 *  roundId: string;
 *  moveBy: number
 * }
 * @param {CallableContext} callableContext
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (data: any, callableContext: CallableContext): Promise<{[key: string]: string}> => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext.app);

  // not logged in
  testRequirement(!auth);

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 2 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'moveBy', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['moveBy', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.moveBy is integer without 0
  testRequirement(!Number.isInteger(data.moveBy) || data.moveBy === 0);

  testRequirement(!callableContext.auth?.token.secretKey);
  const cryptoKey = await getCryptoKey(callableContext.auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const roundId = data.roundId;
    const moveBy = data.moveBy;
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    const rounds = JSON.parse(await decrypt(userDocSnap.data()?.rounds, cryptoKey));
    const toMoveIndex = rounds.indexOf(data.roundId);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= rounds.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    rounds.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    transaction.update(userDocSnap.ref, {
      rounds: await encrypt(rounds, cryptoKey)
    });

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
