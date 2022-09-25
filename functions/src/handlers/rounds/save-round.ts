import {firestore} from 'firebase-admin';
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

const app = firestore();

/**
 * Save times of day
 * @function handler
 * @param context Context
 * @return {Promise<{created: boolean, details: string, roundId: string}>}
 **/
export const handler = (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

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
  let userDocSnapData: firestore.DocumentData | undefined;
  let roundDocSnap: firestore.DocumentSnapshot;

  return getCryptoKey(auth?.token.secretKey).then((cryptoKey) => {
    return app.runTransaction((transaction) => {

      const transactionWrite = new TransactionWrite(transaction);
      return getUserDocSnap(app, transaction, auth?.uid as string).then((_userDocSnap) => {

        userDocSnap = _userDocSnap;
        userDocSnapData = userDocSnap.data();
        return transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
      }).then((_roundDocSnapTmp) => {
        roundDocSnapTmp = _roundDocSnapTmp;

        if (userDocSnapData?.rounds) {
          return decrypt(userDocSnap.data()?.rounds, cryptoKey).then((text) => JSON.parse(text) as string []);
        }

        return [] as string[];

      }).then((rounds) => {

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

          return decryptRound(roundDocSnap.data() as {value: string}, cryptoKey).then((round) => {

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
    }).then(() => ({
      code: created ? 201 : 200,
      body: {
        created,
        roundId,
        details: created ? 'Your round has been created 😉' : 'Your round has been updated 🙃',
      }
    }));
  });
};
