import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
// @ts-ignore
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
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

    return getAuth().setCustomUserClaims(user.uid, customUserClaims).then(() => {
      const app = firestore();

      return app.runTransaction(async (transaction) => {
        const userDocSnap = await getUser(app, transaction, user.uid);

        transaction.set(userDocSnap.ref, {
          hasSymmetricKey: true,
          cryptoKeyTest: await encrypt(user.uid, cryptoKey)
        });

        return transaction;
      }).catch(() => {
        throw new Error(`user ${user.uid} rsa key creation`);
      });
    });
  } catch (e) {
    console.log(e);
  }
}
