const {getAuth} = require('firebase-admin/auth');
import {CallableRequest} from 'firebase-functions/lib/common/providers/https';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../../config';
import {testRequirement} from '../../../helpers/test-requirement';

const crc32c = require('fast-crc32c');

export const handler = (request: CallableRequest): Promise<string> => {

  const auth = request.auth;
  const data = request.data;

  // with data
  testRequirement(data !== null)

  // without app check
  testRequirement(!request.app);

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
        isAnonymous: auth?.token.firebase.sign_in_provider === 'anonymous' ? true : undefined
      });
  });
};
