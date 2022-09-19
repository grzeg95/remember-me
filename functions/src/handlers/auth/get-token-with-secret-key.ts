import {getAuth} from 'firebase-admin/auth';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Context} from '../../helpers/https-tools';
import {FunctionResultPromise} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';

const crc32c = require('fast-crc32c');

export const handler = (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  // with data
  testRequirement(data !== null)

  // not logged in
  testRequirement(!auth);

  // email not verified, not for anonymous
  testRequirement(
    !auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous
  );

  // @ts-ignore
  const ciphertext = new Uint8Array(auth?.token.encryptedSymmetricKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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
      .createCustomToken(auth?.uid as string, {
        secretKey: (decryptResponse.plaintext || '').toString(),
        isAnonymous: auth?.token.firebase.sign_in_provider === 'anonymous'
      }).then((token) => {
        return {
          code: 200,
          body: token
        }
      });
  });
};
