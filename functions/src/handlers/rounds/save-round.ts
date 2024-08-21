import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import '../../utils/global.prototype';
import {Round, RoundDocUncrypded} from '../../models/round';
import {User} from '../../models/user';
import {encrypt, encryptRound, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap, writeUser} from '../../utils/user';

const firestore = getFirestore();

/**
 * Save times of day
 * @function handler
 * @param {CallableRequest} request
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
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
  testRequirement(dataKeys.length !== 2);

  // data has not 'task' and 'taskId'
  testRequirement(!dataKeys.toSet().hasOnly(['roundId', 'name'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.name is not string
  testRequirement(typeof data.name !== 'string');

  // data.name is not a string in [1, 256]
  data.name = data.name.trim();
  testRequirement(data.name.length < 1 || data.name.length > 256);

  let roundId = data.roundId;
  let created = false;
  let roundDocSnap: DocumentSnapshot<Round>;

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(firestore, transaction, auth?.uid as string);
    const user = await User.data(userDocSnap, cryptoKey);

    const roundTmpRef = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnapTmp = await transaction.get(roundTmpRef);

    const rounds = user.decryptedRounds;

    let roundsEncryptPromise;

    // create round
    if (!roundDocSnapTmp.exists) {

      // check if there is max 5 rounds
      testRequirement(rounds.length >= 5, {details: 'You can own 5 rounds 🤔'});

      const roundRef = Round.ref(userDocSnap.ref);
      roundDocSnap = await transaction.get(roundRef);

      const roundEncryptPromise = encryptRound({
        timesOfDay: [],
        timesOfDayCardinality: [],
        name: data.name,
        todaysIds: [],
        tasksIds: []
      } as RoundDocUncrypded, cryptoKey);

      roundId = roundDocSnap.id;
      rounds.push(roundId);
      roundsEncryptPromise = encrypt(rounds, cryptoKey);
      created = true;
      transactionWrite.delete(roundDocSnapTmp.ref);

      // update user
      writeUser(transactionWrite, userDocSnap, roundsEncryptPromise.then((encryptedRounds) => {
        return {
          rounds: encryptedRounds
        };
      }));

      transactionWrite.create(roundDocSnap.ref, roundEncryptPromise);
    } else {

      roundDocSnap = roundDocSnapTmp;
      const round = await Round.data(roundDocSnap, cryptoKey);
      /*
       * Check if name was changed
       * */
      testRequirement(round.name === data.name);

      transactionWrite.update(roundDocSnap.ref, encryptRound({
        name: data.name,
        timesOfDay: round.timesOfDay,
        timesOfDayCardinality: round.timesOfDayCardinality,
        todaysIds: round.todaysIds,
        tasksIds: round.tasksIds
      } as RoundDocUncrypded, cryptoKey));
    }

    return transactionWrite.execute();
  }).then(() => ({
    created,
    roundId,
    details: created ? 'Your round has been created 😉' : 'Your round has been updated 🙃',
  }));
};
