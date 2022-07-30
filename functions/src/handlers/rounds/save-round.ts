import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {firestore} from 'firebase-admin';
import {getUser, writeUser} from '../../helpers/user';
import {
  decrypt, decryptRound,
  encrypt,
  encryptRound, getCryptoKey
} from '../../security/security';
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

/**
 * Save times of day
 * @function handler
 * @param {*} data
 * {
 *  roundId: string,
 *  name: string
 * }
 * @param {CallableContext} callableContext
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 **/
export const handler = async (data: any, callableContext: CallableContext): Promise<{created: boolean; details: string; roundId: string}> => {

  const auth = callableContext?.auth;

  // without app check
  testRequirement(!callableContext?.app);

  // not logged in
  testRequirement(!auth);

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

  testRequirement(!auth?.token.secretKey);
  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  let roundId = data.roundId;
  let created = false;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnapTmp = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
    const userDocSnapData = userDocSnap.data();
    const rounds = userDocSnapData?.rounds ? JSON.parse(await decrypt(userDocSnap.data()?.rounds, cryptoKey)) as string[] : [];

    let roundDocSnap: DocumentSnapshot;
    let roundsEncryptPromise;

    // create round
    if (!roundDocSnapTmp.exists) {

      // check if there is max 5 rounds
      testRequirement(rounds.length >= 5, `You can own 5 rounds 🤔`);

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
      transaction.delete(roundDocSnapTmp.ref);

      // update user
      const userDataToWrite = {
        rounds: await roundsEncryptPromise
      };
      writeUser(transaction, userDocSnap, userDataToWrite);

      transaction.create(roundDocSnap.ref, await roundEncryptPromise);
    } else {

      roundDocSnap = roundDocSnapTmp;
      const round = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);
      /*
      * Check if name was changed
      * */
      testRequirement(round.name === data.name);

      transaction.update(roundDocSnap.ref, await encryptRound({
        name: data.name,
        timesOfDay: round.timesOfDay,
        timesOfDayCardinality: round.timesOfDayCardinality,
        todaysIds: round.todaysIds,
        tasksIds: round.tasksIds
      }, cryptoKey));
    }

    return transaction;

  }).then(() =>
    created ? ({
      created,
      roundId,
      details: 'Your round has been created 😉',
    }) : ({
      created,
      roundId,
      details: 'Your round has been updated 🙃'
    })
  );
};
