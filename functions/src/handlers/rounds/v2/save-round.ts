import {CallableRequest} from 'firebase-functions/lib/common/providers/https';
import {Round} from '../../../helpers/models';
import {testRequirement} from '../../../helpers/test-requirement';
import {firestore} from 'firebase-admin';
import {TransactionWrite} from '../../../helpers/transaction-write';
import {getUser, writeUser} from '../../../helpers/user';
import {
  decrypt, decryptRound,
  encrypt,
  encryptRound, getCryptoKey
} from '../../../helpers/security';

const app = firestore();

/**
 * Save times of day
 * @function handler
 * {
 *  roundId: string,
 *  name: string
 * }
 * @param {CallableRequest} request
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 **/
export const handler = (request: CallableRequest): Promise<{created: boolean; details: string; roundId: string}> => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  testRequirement(!request.app);

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

  let roundId = data.roundId;
  let created = false;
  let userDocSnap: firestore.DocumentSnapshot;
  let roundDocSnapTmp: firestore.DocumentSnapshot;
  let rounds: string[];
  let userDocSnapData: firestore.DocumentData | undefined;
  let roundDocSnap: firestore.DocumentSnapshot;
  let round: Round;

  return getCryptoKey(auth?.token.secretKey).then((cryptoKey) => {
    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);
      return getUser(app, transaction, auth?.uid as string).then((_userDocSnap) => {

        userDocSnap = _userDocSnap;
        userDocSnapData = userDocSnap.data();
        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
      }).then((_roundDocSnapTmp) => {
        roundDocSnapTmp = _roundDocSnapTmp;


        if (userDocSnapData?.rounds) {
          return decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => JSON.parse(text) as string []);
        }

        return [] as string[];

      }).then((_rounds) => {
        rounds = _rounds

        let roundsEncryptPromise;

        // create round
        if (!roundDocSnapTmp.exists) {

          // check if there is max 5 rounds
          testRequirement(rounds.length >= 5, `You can own 5 rounds 🤔`);

          return transaction.get(userDocSnap.ref.collection('rounds').doc()).then((_roundDocSnap) => {
            roundDocSnap = _roundDocSnap;

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
            return transactionWrite.execute();
          });
        } else {

          roundDocSnap = roundDocSnapTmp;

          return decryptRound(roundDocSnap.data() as {value: string}, cryptoKey).then((_round) => {
            round = _round;

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

            return transactionWrite.execute();
          });
        }
      });
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
  });
};
