import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {testRequirement} from '../helpers/test-requirement';
const crc32c = require('fast-crc32c');

export const decryptPrivateKey = async (encryptedPrivateKey: string): Promise<string> => {

  // @ts-ignore
  const ciphertext = new Uint8Array(encryptedPrivateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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

  const privateKey = (decryptResponse.plaintext || '').toString()
  testRequirement(privateKey.length === 0);

  return privateKey;
}
