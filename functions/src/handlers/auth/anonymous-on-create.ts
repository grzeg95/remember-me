import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey, webcrypto} from 'crypto';
import {firestore} from 'firebase-admin';
import {UserRecord, getAuth} from 'firebase-admin/auth';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {encrypt} from '../../helpers/security';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from '../../helpers/transaction-write';
import {getUserDocSnap} from '../../helpers/user';
import {createSampleUserData} from './user-before-create';

const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

export const handler = (user: UserRecord) => {

  if (user.providerData.length) {
    return Promise.resolve();
  }

  const key = randomBytes(32);
  let userDocSnap: firestore.DocumentSnapshot;
  let transactionWrite: TransactionWrite;
  let cryptoKey: CryptoKey;
  const app = firestore();

  return app.runTransaction(async (transaction) => {

    if (!publicKey) {
      [publicKey] = await keyManagementServiceClient.getPublicKey({
        name: cryptoKeyVersionPath
      });
    }

    testRequirement(
      publicKey?.name !== cryptoKeyVersionPath ||
      crc32c.calculate(publicKey?.pem) !== Number(publicKey?.pemCrc32c?.value),
      'GetPublicKey: request corrupted in-transit'
    );

    transactionWrite = new TransactionWrite(transaction);

    const encryptedSymmetricKey = publicEncrypt(
      {
        key: publicKey?.pem,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      } as RsaPublicKey,
      Buffer.from(key.toString('hex'))
    ).toString('hex');

    return webcrypto.subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    ).then((_cryptoKey) => {
      cryptoKey = _cryptoKey;
      return getAuth().setCustomUserClaims(user.uid, {encryptedSymmetricKey});
    }).then(() => {
      return getUserDocSnap(app, transaction, user.uid);
    }).then((_userDocSnap: firestore.DocumentSnapshot) => {
      userDocSnap = _userDocSnap;

      // createSampleUserData
      return createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);
    }).then((roundId) => {
      transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
        return {
          rounds,
          hasEncryptedSecretKey: true
        }
      }));

      return transactionWrite.execute();
    });
  }).catch((e) => {
    console.error(e);
    throw new Error(`user ${user.uid} rsa key creation`);
  });
};
