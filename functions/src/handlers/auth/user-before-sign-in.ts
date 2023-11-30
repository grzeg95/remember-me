import {getFirestore} from 'firebase-admin/firestore';
import {
  AuthBlockingEvent,
  BeforeSignInResponse
} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';

/* eslint-disable @typescript-eslint/no-var-requires*/

const crc32c = require('fast-crc32c');

export const handler = async (event: AuthBlockingEvent): Promise<BeforeSignInResponse> => {

  const app = getFirestore();

  const snap = await app.doc(`users/${event.data.uid}`).get();

  const customClaims = event.data.customClaims || {};

  const encryptedSymmetricKey = customClaims?.encryptedSymmetricKey;

  if (encryptedSymmetricKey && snap.exists && typeof snap.data()?.hasEncryptedSecretKey === 'boolean' && snap.data()?.hasEncryptedSecretKey) {

    const ciphertext = new Uint8Array(encryptedSymmetricKey.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
    const ciphertextCrc32c = crc32c.calculate(ciphertext);

    const [decryptResponse] = await keyManagementServiceClient.asymmetricDecrypt({
      name: cryptoKeyVersionPath,
      ciphertext,
      ciphertextCrc32c: {
        value: ciphertextCrc32c
      },
    });
    const secretKey = (decryptResponse.plaintext || '').toString();

    const sessionClaims: any = {secretKey};

    return {
      sessionClaims
    } as BeforeSignInResponse;
  } else {
    return {};
  }
};
