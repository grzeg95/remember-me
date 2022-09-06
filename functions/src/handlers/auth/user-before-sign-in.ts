import {firestore} from 'firebase-admin';
import {AuthUserRecord, BeforeSignInResponse} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';

const crc32c = require('fast-crc32c');

export const handler = (user: AuthUserRecord): Promise<BeforeSignInResponse> => {

  const app = firestore();

  return app.doc(`users/${user.uid}`).get().then((snap) => {

    let customClaims;

    if (process.env.FUNCTIONS_EMULATOR) {
      customClaims = JSON.parse(user.customClaims?.toString() || '{}');
    } else {
      customClaims = user.customClaims || {};
    }

    const encryptedSymmetricKey = customClaims?.encryptedSymmetricKey as string;

    if (encryptedSymmetricKey && snap.exists && typeof snap.data()?.hasEncryptedSecretKey === 'boolean' && snap.data()?.hasEncryptedSecretKey) {

      // @ts-ignore
      const ciphertext = new Uint8Array((encryptedSymmetricKey).match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
      const ciphertextCrc32c = crc32c.calculate(ciphertext);

      return keyManagementServiceClient.asymmetricDecrypt({
        name: cryptoKeyVersionPath,
        ciphertext,
        ciphertextCrc32c: {
          value: ciphertextCrc32c
        },
      }).then(([decryptResponse]) => {
        const secretKey = (decryptResponse.plaintext || '').toString();

        let sessionClaims: any = {secretKey}

        if (process.env.FUNCTIONS_EMULATOR) {
          sessionClaims = JSON.stringify(sessionClaims)
        }

        return {
          sessionClaims
        } as BeforeSignInResponse;
      });
    }

    throw new Error();
  }).catch(() => {
    return {};
  });
};
