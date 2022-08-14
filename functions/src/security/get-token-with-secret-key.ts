const {getAuth} = require('firebase-admin/auth');
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {testRequirement} from '../helpers/test-requirement';

const crc32c = require('fast-crc32c');

export const handler = async (
  data: any,
  context: CallableContext
): Promise<string | null> => {

  // with data
  testRequirement(data !== null)

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

  // @ts-ignore
  const ciphertext = new Uint8Array(context.auth?.token.encryptedSymmetricKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  const ciphertextCrc32c = crc32c.calculate(ciphertext);

  return keyManagementServiceClient.asymmetricDecrypt({
    name: cryptoKeyVersionPath,
    ciphertext,
    ciphertextCrc32c: {
      value: ciphertextCrc32c
    },
  }).then(([decryptResponse]) => {
    testRequirement(
      !decryptResponse.verifiedCiphertextCrc32c ||
      crc32c.calculate(decryptResponse.plaintext) !==
      Number(decryptResponse.plaintextCrc32c?.value),
      'AsymmetricDecrypt: request corrupted in-transit'
    );

    // Service account does not have required permissions
    // https://firebase.google.com/docs/auth/admin/create-custom-tokens#service_account_does_not_have_required_permissions

    return getAuth()
      .createCustomToken(context.auth?.uid as string, {
        secretKey: (decryptResponse.plaintext || '').toString(),
        isAnonymous: context.auth?.token.firebase.sign_in_provider === 'anonymous' ? true : undefined
      })
      .then((customToken: string) => customToken);
  });
};
