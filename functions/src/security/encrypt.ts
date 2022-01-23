import * as CryptoJS from 'crypto-js';

export const encrypt = (data: any, privateKey: string): string => {

  let dataString = '';

  try {
    dataString = JSON.stringify(data);
  } catch (e) {
    dataString = e + '';
  }

  return CryptoJS.AES.encrypt(dataString, privateKey).toString();
}
