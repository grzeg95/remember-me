import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import '../../utils/global.prototype';
import {User} from '../../models/user';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';

const firestore = getFirestore();

/**
 * Set rounds order
 * @function handler
 * @return {Promise<Object.<string, string>>}
 * @param {CallableRequest} request
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

  // data has not 2 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'moveBy', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['moveBy', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.moveBy is integer without 0
  testRequirement(!Number.isInteger(data.moveBy) || data.moveBy === 0);

  const roundId = data.roundId;
  const moveBy = data.moveBy;

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(firestore, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
    const user = await User.data(userDocSnap, cryptoKey);

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    const rounds = user.decryptedRounds;

    const toMoveIndex = rounds.indexOf(data.roundId);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= rounds.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    rounds.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    transactionWrite.update(userDocSnap.ref, encrypt(rounds, cryptoKey).then((encryptedRounds) => {
      return {
        rounds: encryptedRounds
      };
    }));

    return transactionWrite.execute();
  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));
};
