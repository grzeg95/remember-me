import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey, webcrypto} from 'crypto';
import {getAuth, UserRecord} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {EventContext} from 'firebase-functions';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {encrypt, getUserDocSnap, testRequirement, TransactionWrite} from '../../tools';
import {createSampleUserData} from './user-before-create';

const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

export const handler = (user: UserRecord, context: EventContext) => {

  const eventAgeMs = Date.now() - Date.parse(context.timestamp);
  const eventMaxAgeMs = 60 * 1000;
  if (eventAgeMs > eventMaxAgeMs) {
    console.log(`Dropping event ${context.eventId} with age[ms]: ${eventAgeMs}`);
    return Promise.resolve();
  }

  if (user.providerData.length) {
    return Promise.resolve();
  }

  const key = randomBytes(32);
  const app = getFirestore();

  return app.runTransaction(async (transaction) => {

    if (!publicKey) {
      [publicKey] = await keyManagementServiceClient.getPublicKey({
        name: cryptoKeyVersionPath
      });
    }

    testRequirement(
      publicKey?.name !== cryptoKeyVersionPath ||
      crc32c.calculate(publicKey?.pem) !== Number(publicKey?.pemCrc32c?.value),
      {message: 'GetPublicKey: request corrupted in-transit'}
    );

    const transactionWrite = new TransactionWrite(transaction);

    const encryptedSymmetricKey = publicEncrypt(
      {
        key: publicKey?.pem,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      } as RsaPublicKey,
      Buffer.from(key.toString('hex'))
    ).toString('hex');

    const cryptoKey = await webcrypto.subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    );

    await getAuth().setCustomUserClaims(user.uid, {encryptedSymmetricKey});
    const userDocSnap = await getUserDocSnap(app, transaction, user.uid);

    // createSampleUserData
    const roundId = await createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);

    transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
      return {
        rounds,
        hasEncryptedSecretKey: true
      };
    }));

    return transactionWrite.execute();
  }).catch((e) => {
    console.error(e);
    throw new Error(`user ${user.uid} rsa key creation`);
  });
};
