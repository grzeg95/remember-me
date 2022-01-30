import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
// @ts-ignore
import * as CryptoJS from 'crypto-js';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {testRequirement} from '../helpers/test-requirement';
import {getUser} from '../helpers/user';

const crypto = require('crypto');
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

  const encryptedSymmetricKey = crypto.publicEncrypt(
    {
      key: publicKey.pem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    Buffer.from(crypto.randomBytes(8).toString('hex'))
  ).toString('hex');

  const customUserClaims = {
    encryptedSymmetricKey
  };

  return getAuth().setCustomUserClaims(user.uid, customUserClaims).then(() => {
    const app = firestore();

    return app.runTransaction(async (transaction) => {
      const userDocSnap = await getUser(app, transaction, user.uid as string);

      transaction.set(userDocSnap.ref, {
        hasSymmetricKey: true
      });

      return transaction;
    }).catch(() => {
      console.error(`user ${user.uid} rsa key creation`);
    });
  });
};
