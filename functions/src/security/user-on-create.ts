import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
// @ts-ignore
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {handler as saveRound} from '../handlers/rounds/save-round';
import {handler as saveTask} from '../handlers/rounds/save-task';
import {testRequirement} from '../helpers/test-requirement';
import {getUser} from '../helpers/user';
import {encrypt} from './security';

const crypto = require('crypto');
const {subtle} = crypto.webcrypto;
const {getAuth} = require('firebase-admin/auth');
const crc32c = require('fast-crc32c');

export const handler = async (user: UserRecord, context: EventContext) => {

  const [publicKey] = await keyManagementServiceClient.getPublicKey({
    name: cryptoKeyVersionPath
  });

  testRequirement(
    publicKey.name !== cryptoKeyVersionPath ||
    crc32c.calculate(publicKey.pem) !== Number(publicKey.pemCrc32c?.value),
    'GetPublicKey: request corrupted in-transit'
  );

  try {

    const key = crypto.randomBytes(32);

    const encryptedSymmetricKey = crypto.publicEncrypt(
      {
        key: publicKey.pem,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      key.toString('hex')
    ).toString('hex');

    const customUserClaims = {
      encryptedSymmetricKey
    };

    const cryptoKey = await subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    );

    return getAuth().setCustomUserClaims(user.uid, customUserClaims).then(async () => {

      const app = firestore();

      try {
        const savedRound = await saveRound(
          {
            roundId: 'null',
            name: 'Daily'
          },
          undefined, {
            uid: user.uid,
            decryptedSymmetricKey: key.toString('hex')
          }
        );

        await saveTask(
          {
            task: {
              timesOfDay: ['Before work'],
              daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
              description: 'Drink coffee 🤠'
            },
            taskId: 'null',
            roundId: savedRound.roundId
          },
          undefined, {
            uid: user.uid,
            decryptedSymmetricKey: key.toString('hex')
          }
        );
      } catch (e) {
        console.log(e);
      }

      return app.runTransaction(async (transaction) => {
        const userDocSnap = await getUser(app, transaction, user.uid);

        // create simple two number adding test
        const numbers = crypto.randomBytes(2);

        if (userDocSnap.exists) {
          transaction.update(userDocSnap.ref, {
            cryptoKeyTest: await encrypt({
              test: [numbers[0], numbers[1]],
              result: numbers[0] + numbers[1]
            }, cryptoKey)
          });
        } else {
          transaction.set(userDocSnap.ref, {
            cryptoKeyTest: await encrypt({
              test: [numbers[0], numbers[1]],
              result: numbers[0] + numbers[1]
            }, cryptoKey)
          });
        }

        return transaction;
      }).catch(() => {
        throw new Error(`user ${user.uid} rsa key creation`);
      });
    });
  } catch (e) {
    console.log(e);
  }
}
