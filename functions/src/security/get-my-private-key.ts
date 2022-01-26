import {CallableContext} from 'firebase-functions/lib/providers/https';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {testRequirement} from '../helpers/test-requirement';
import {RsaKey} from './security';

const crc32c = require('fast-crc32c');

export const handler = async (
  data: any,
  context: CallableContext
): Promise<string> => {

  // @ts-ignore
  const ciphertext = new Uint8Array(context.auth?.token.privateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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
    'AsymmetricDecrypt: request corrupted in-transit'
  );

  return (JSON.parse((decryptResponse.plaintext || '').toString()) as RsaKey).private;
};
