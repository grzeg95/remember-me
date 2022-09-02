import {firestore} from 'firebase-admin';
import {AuthUserRecord} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';

const crc32c = require('fast-crc32c');

export const handler = (user: AuthUserRecord) => {

  const app = firestore();

  return app.doc(`users/${user.uid}`).get().then((snap) => {

    const customClaims = JSON.parse(user.customClaims?.toString() || '{}');
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

        let newCustomClaims: any = {secretKey}

        if (process.env.FUNCTIONS_EMULATOR) {
          newCustomClaims = JSON.stringify(newCustomClaims)
        }

        return {
          customClaims: newCustomClaims
        };
      });
    }

    throw new Error();
  }).catch(() => {
    return {};
  });
};
