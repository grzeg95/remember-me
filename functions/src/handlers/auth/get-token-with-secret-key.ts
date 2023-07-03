import {getAuth} from 'firebase-admin/auth';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Context, FunctionResultPromise, testRequirement} from '../../tools';

const crc32c = require('fast-crc32c');

export const handler = async (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  // with data
  testRequirement(data !== null);

  // @ts-ignore
  const ciphertext = new Uint8Array(auth?.token.encryptedSymmetricKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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

  const token = await getAuth()
    .createCustomToken(auth?.uid as string, {
      secretKey: (decryptResponse.plaintext || '').toString(),
      isAnonymous: auth?.token.firebase.sign_in_provider === 'anonymous'
    });

  return {
    code: 200,
    body: token
  };
};
