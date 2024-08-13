import {Buffer} from 'buffer';

import crypto = require('crypto');

export const protectObjectDecryption = <T>(emptyOne: T): (value: any) => Promise<T> => {
  return async (value: T) => {
    if (typeof value === 'string' || !value) {
      return emptyOne;
    }
    return value;
  };
};

export const getCryptoKey = (secretKey: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    Buffer.from(secretKey, 'hex'),
    {name: 'AES-GCM'},
    false,
    ['decrypt']
  );
};

export const encrypt = (data: any, cryptoKey: CryptoKey): Promise<string> => {

  let dataString;

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  const iv = crypto.randomBytes(16);
  const dataBuffer = Buffer.from(dataString);

  return crypto.webcrypto.subtle.encrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, dataBuffer)
    .then((encrypted: ArrayBuffer) => {
      return Buffer.concat([iv, Buffer.from(encrypted)]).toString('base64');
    });
};

export const decrypt = async <T = string>(encryptedData: string | null | undefined, cryptoKey: CryptoKey): Promise<T | string | null> => {

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
        return text;
      }
    });
};
