import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
// @ts-ignore
import * as cryptoJS from 'crypto-js';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {testRequirement} from '../../helpers/test-requirement';
const crypto = require('crypto');
const { getAuth } = require('firebase-admin/auth');
const crc32c = require('fast-crc32c');

export const handler = async (user: UserRecord, context: EventContext): Promise<void> => {

  const symmetricKey = crypto.randomBytes(16).toString('hex');

  const [publicKey] = await keyManagementServiceClient.getPublicKey({
    name: cryptoKeyVersionPath
  });

  testRequirement(
    publicKey.name !== cryptoKeyVersionPath ||
    crc32c.calculate(publicKey.pem) !== Number(publicKey.pemCrc32c?.value),
    'GetPublicKey: request corrupted in-transit'
  );

  const symmetricKeyEncryptedByPublicKey = crypto.publicEncrypt(
    {
      key: publicKey.pem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    Buffer.from(symmetricKey)
  ).toString('hex');

  const customUserClaims = {
    privateKey: symmetricKeyEncryptedByPublicKey
  };

  return getAuth().setCustomUserClaims(user.uid, customUserClaims);
}
