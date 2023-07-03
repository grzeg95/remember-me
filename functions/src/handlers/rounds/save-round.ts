import {DocumentData, DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {
  Context,
  decrypt,
  decryptRound,
  encrypt,
  encryptRound,
  FunctionResultPromise,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite,
  writeUser
} from '../../tools';

import '../../tools/global.prototype';

const app = getFirestore();

/**
 * Save times of day
 * @function handler
 * @param context Context
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 **/
export const handler = async (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!context.app || !auth || (!auth?.token.email_verified &&
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
  let userDocSnapData: DocumentData | undefined;
  let roundDocSnap: DocumentSnapshot;

  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, auth?.uid as string);
    userDocSnapData = userDocSnap.data();
    const roundDocSnapTmp = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    let rounds: string[] = [];

    if (userDocSnapData?.rounds) {
      rounds = await decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => JSON.parse(text) as string []);
    }

    let roundsEncryptPromise;

    // create round
    if (!roundDocSnapTmp.exists) {

      // check if there is max 5 rounds
      testRequirement(rounds.length >= 5, {details: `You can own 5 rounds 🤔`});

      roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc());

      const roundEncryptPromise = encryptRound({
        timesOfDay: [],
        timesOfDayCardinality: [],
        name: data.name,
        todaysIds: [],
        tasksIds: []
      }, cryptoKey);

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
      const round = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
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
      }, cryptoKey));
    }

    return transactionWrite.execute();
  }).then(() => ({
    code: created ? 201 : 200,
    body: {
      created,
      roundId,
      details: created ? 'Your round has been created 😉' : 'Your round has been updated 🙃',
    }
  }));
};
