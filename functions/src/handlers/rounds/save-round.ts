import {CallableContext} from 'firebase-functions/lib/providers/https';
import {EncryptedRound} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {firestore} from 'firebase-admin';
import {getUser, writeUser} from '../../helpers/user';
import {
  decrypt,
  decryptRoundName,
  decryptRsaKey,
  encrypt,
  encryptRound,
  RsaKey
} from '../../security/security';
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

/**
 * @function handler
 * Save times of day
 * @param data {
    roundId: string,
    name: string
  }
 * @param context CallableContext
 * @return Promise<{ created: boolean; details: string; taskId: string }>
 **/
export const handler = (data: any, context: CallableContext): Promise<{ created: boolean; details: string; roundId: string }> => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

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

  // data.name is not a string in [1, 100]
  data.name = data.name.trim();
  testRequirement(data.name.length < 1 || data.name.length > 100);

  const auth: { uid: string } | undefined = context.auth;

  let roundId = data.roundId;
  let created = false;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    // get rsa key
    // TODO
    let rsaKey: RsaKey;
    if (context.auth?.token.decryptedRsaKey) {
      rsaKey = context.auth?.token.decryptedRsaKey;
    } else {
      rsaKey = await decryptRsaKey(context.auth?.token.encryptedRsaKey);
    }

    const roundDocSnapTmp = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
    const userDocSnapData = userDocSnap.data();
    const rounds = userDocSnapData?.rounds ? JSON.parse(decrypt(userDocSnap.data()?.rounds, rsaKey)) as string[] : [];

    let roundDocSnap: DocumentSnapshot;

    // create round
    if (!roundDocSnapTmp.exists) {

      // check if there is max 5 rounds
      testRequirement(rounds.length >= 5, `You can own 5 rounds 🤔`);

      roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc());
      transaction.create(roundDocSnap.ref, encryptRound({
        taskSize: 0,
        timesOfDay: [],
        timesOfDayCardinality: [],
        name: data.name
      }, rsaKey));

      roundId = roundDocSnap.id;
      rounds.push(roundId);
      created = true;
      transaction.delete(roundDocSnapTmp.ref);

    } else {

      roundDocSnap = roundDocSnapTmp;
      const roundName = decryptRoundName(roundDocSnap.data() as EncryptedRound, rsaKey);
      /*
      * Check if name was changed
      * */
      testRequirement(roundName === data.name);

      transaction.update(roundDocSnap.ref, {
        name: encrypt(data.name, rsaKey)
      });
    }

    // update user
    const userDataToWrite = {
      rounds: encrypt(rounds, rsaKey)
    };
    writeUser(transaction, userDocSnap, userDataToWrite);

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
