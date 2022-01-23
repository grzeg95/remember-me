import * as CryptoJS from 'crypto-js';

export const decrypt = (data: string, privateKey: string): string => {
  return CryptoJS.AES.decrypt(data, privateKey).toString(CryptoJS.enc.Utf8);
}
