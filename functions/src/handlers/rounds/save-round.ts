import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';

import '../../utils/global.prototype';
import {Round, RoundDoc} from '../../models/round';
import {User, UserDoc} from '../../models/user';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap, writeUser} from '../../utils/user';

const app = getFirestore();

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
  let userDocSnapData: User | undefined;
  let roundDocSnap: DocumentSnapshot<Round, RoundDoc>;

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    userDocSnapData = await User.data(userDocSnap, cryptoKey);
    const roundRefTmp = Round.ref(userDocSnap.ref, roundId);
    const roundDocSnapTmp = await transaction.get(roundRefTmp);

    let roundsIds: string[] = [];

    if (userDocSnapData?.roundsIds) {
      roundsIds = userDocSnapData.roundsIds;
    }

    // create round
    if (!roundDocSnapTmp.exists) {

      // check if there is max 5 rounds
      testRequirement(roundsIds.length >= 5, {details: 'You can own 5 rounds 🤔'});

      const roundRef = Round.ref(userDocSnap.ref, undefined);
      roundDocSnap = await transaction.get(roundRef);

      roundId = roundDocSnap.id;
      roundsIds.push(roundId);
      created = true;
      transactionWrite.delete(roundDocSnapTmp.ref);

      // update user
      writeUser(transactionWrite, userDocSnap, {
        roundsIds
      } as UserDoc);

      const encryptedName = await encrypt(data.name, cryptoKey);
      transactionWrite.create(roundDocSnap.ref, {
        encryptedName,
        encryptedTimesOfDayIds: [],
        timesOfDayIdsCardinality: [],
        todayIds: [],
        tasksIds: []
      } as RoundDoc);
    } else {

      roundDocSnap = roundDocSnapTmp;
      const round = await Round.data(roundDocSnap, cryptoKey);
      /*
       * Check if name was changed
       * */
      testRequirement(round.name === data.name);

      const encryptedName = await encrypt(data.name, cryptoKey);
      transactionWrite.update(roundDocSnap.ref, {
        encryptedName,
      } as RoundDoc);
    }

    return transactionWrite.execute();

  }).then(() => ({
    created,
    roundId,
    details: created ? 'Your round has been created 😉' : 'Your round has been updated 🙃',
  }));
};
