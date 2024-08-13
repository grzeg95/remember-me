import {getAuth} from 'firebase-admin/auth';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {CallableRequest} from 'firebase-functions/v2/https';
import {testRequirement} from '../../utils/test-requirement';

/* eslint-disable @typescript-eslint/no-var-requires*/

const crc32c = require('fast-crc32c');

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  // with data
  testRequirement(data !== null);

  const ciphertext = new Uint8Array(auth?.token.encryptedSymmetricKey.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));

  const ciphertextCrc32c = crc32c.calculate(ciphertext);

  const [decryptResponse] = await keyManagementServiceClient.asymmetricDecrypt({
    name: cryptoKeyVersionPath,
    ciphertext,
    ciphertextCrc32c: {
      value: ciphertextCrc32c
    },
  });

  testRequirement(
    !decryptResponse.verifiedCiphertextCrc32c ||
    crc32c.calculate(decryptResponse.plaintext) !==
    Number(decryptResponse.plaintextCrc32c?.value),
    {message: 'AsymmetricDecrypt: request corrupted in-transit'}
  );

  // Service account does not have required permissions
  // https://firebase.google.com/docs/auth/admin/create-custom-tokens#service_account_does_not_have_required_permissions

  return {
    customToken: await getAuth()
      .createCustomToken(auth?.uid as string, {
        secretKey: (decryptResponse.plaintext || '').toString(),
        isAnonymous: auth?.token.firebase.sign_in_provider === 'anonymous'
      })
  };
};
