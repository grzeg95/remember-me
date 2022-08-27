import {firestore} from 'firebase-admin';
import {CallableRequest} from 'firebase-functions/lib/common/providers/https';
import {testRequirement} from '../../../helpers/test-requirement';
import {TransactionWrite} from '../../../helpers/transaction-write';
import {getUser} from '../../../helpers/user';
import {
  decrypt,
  encrypt,
  getCryptoKey
} from '../../../helpers/security';

const app = firestore();

/**
 * Set rounds order
 * @function handler
 * {
 *  roundId: string;
 *  moveBy: number
 * }
 * @param {CallableRequest} request
 * @return {Promise<Object.<string, string>>}
 **/
export const handler = async (request: CallableRequest): Promise<{[key: string]: string}> => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  testRequirement(!request.app);

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

  // data has not 2 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'moveBy', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['moveBy', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.moveBy is integer without 0
  testRequirement(!Number.isInteger(data.moveBy) || data.moveBy === 0);

  testRequirement(!auth?.token.secretKey);

  let transactionWrite: TransactionWrite;
  let transaction: firestore.Transaction;
  let userDocSnap: firestore.DocumentSnapshot;
  const roundId = data.roundId;
  const moveBy = data.moveBy;
  let cryptoKey: CryptoKey;

  return getCryptoKey(auth?.token.secretKey).then((_cryptoKey) => {
    cryptoKey = _cryptoKey;

    return app.runTransaction((_transaction) => {

      transaction = _transaction;
      transactionWrite = new TransactionWrite(transaction);

      return getUser(app, transaction, auth?.uid as string).then((_userDocSnap) => {

        userDocSnap = _userDocSnap;
        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

      }).then((roundDocSnap) => {

        // check if round exists
        testRequirement(!roundDocSnap.exists);

        return decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => {
          return JSON.parse(text) as string[];
        });

      }).then((rounds) => {

        const toMoveIndex = rounds.indexOf(data.roundId);

        testRequirement(toMoveIndex === -1);
        testRequirement(moveBy > 0 && toMoveIndex + moveBy >= rounds.length);
        testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

        rounds.move(toMoveIndex, toMoveIndex + moveBy);

        // update user
        transactionWrite.update(userDocSnap.ref, encrypt(rounds, cryptoKey).then((encryptedRounds) => {
          return {
            rounds: encryptedRounds
          }
        }));

        return transactionWrite.execute();
      });

    });
  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
