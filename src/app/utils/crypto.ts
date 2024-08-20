import {Buffer} from 'buffer';

export type BasicEncryptedValue = {value: string};

export const getCryptoKey = (secretKey: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    Buffer.from(secretKey, 'hex'),
    {name: 'AES-GCM'},
    false,
    ['decrypt']
  );
}

export const decrypt = async <T = string>(encryptedData: string | null | undefined, cryptoKey: CryptoKey): Promise<T | null> => {

  if (!encryptedData) {
    return null;
  }

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)
    .then((arrayBuffer) => {
      const text = Buffer.from(arrayBuffer).toString('utf-8');

      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    });
}
