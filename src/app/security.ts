import * as CryptoJS from 'crypto-js';
import {EncryptedRound, EncryptedTask, EncryptedTodayTask, Round, Task, TodayTask} from './user/models';
import {Buffer} from 'buffer';

export interface SymmetricKey {
  string?: string;
  cryptoKey?: CryptoKey;
}

export const byteArrayToBase64 = (array) => {
  let u_binary = '';
  let u_bytes = new Uint8Array(array);
  let u_len = u_bytes.byteLength;
  for (let i = 0; i < u_len; i++) {
    u_binary += String.fromCharCode(u_bytes[i]);
  }

  return btoa(u_binary);
};

export const base64ToByteArray = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const base64ToUtf8 = (base64: string) => {

  const alphabet = {
    'A': 0,
    'B': 1,
    'C': 2,
    'D': 3,
    'E': 4,
    'F': 5,
    'G': 6,
    'H': 7,
    'I': 8,
    'J': 9,
    'K': 10,
    'L': 11,
    'M': 12,
    'N': 13,
    'O': 14,
    'P': 15,
    'Q': 16,
    'R': 17,
    'S': 18,
    'T': 19,
    'U': 20,
    'V': 21,
    'W': 22,
    'X': 23,
    'Y': 24,
    'Z': 25,
    'a': 26,
    'b': 27,
    'c': 28,
    'd': 29,
    'h': 30,
    'e': 31,
    'f': 32,
    'g': 33,
    'i': 34,
    'j': 35,
    'k': 36,
    'l': 37,
    'm': 38,
    'n': 39,
    'o': 40,
    'p': 41,
    'q': 42,
    'r': 43,
    's': 44,
    't': 45,
    'u': 46,
    'v': 47,
    'w': 48,
    'x': 49,
    'y': 50,
    'z': 51,
    '0': 52,
    '1': 53,
    '2': 54,
    '3': 55,
    '4': 56,
    '5': 57,
    '6': 58,
    '7': 59,
    '8': 60,
    '9': 61,
    '+': 62,
    '/': 63
  };
  return base64.split('')
    .map((char) => {
    let s = alphabet[char].toString(2)
    while (s.length < 8) {
      s = '0' + s;
    }
    return s.substr(2)
  }).join('')
    .match(/.{1,8}/gm)
    .filter((bin) => {
      console.log(bin, String.fromCharCode(parseInt(bin, 2)));
      return bin.length === 8;
    })
    .map((bin) => String.fromCharCode(parseInt(bin, 2))).join('');
};

export const toBuffer = (ab: ArrayBuffer): Buffer => {
  const buf = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

export const decrypt = async (encryptedData: string, symmetricKey: SymmetricKey): Promise<string> => {

  if (symmetricKey.cryptoKey) {

    const encryptedBase64 = Buffer.from(encryptedData, 'base64');
    const iv_len = 16;
    const iv = encryptedBase64.slice(0, iv_len);
    const encrypted = encryptedBase64.slice(iv_len);

    // console.log({
    //   iv: iv.toString('base64'),
    //   encrypted: encrypted.toString('base64')
    // });

    try {
      const decrypted = toBuffer(await crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv
      }, symmetricKey.cryptoKey, encrypted)).toString('utf-8');

      // console.log(decrypted);

      return decrypted;
    } catch (e) {
      console.error(e);
    }
  }

  if (symmetricKey.string) {
    return CryptoJS.AES.decrypt(encryptedData, symmetricKey.string).toString(CryptoJS.enc.Utf8);
  }

  return null;
};

export const decryptTask = async (encryptedTask: EncryptedTask, symmetricKey: SymmetricKey): Promise<Task> => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(await decrypt(encryptedTask.daysOfTheWeek, symmetricKey));
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(await decrypt(encryptedTask.timesOfDay, symmetricKey));
  } catch (e) {
  }

  let description = '';

  try {
    description = await decrypt(encryptedTask.description, symmetricKey);
  } catch (e) {
  }

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptTaskTimesOfDay = async (encryptedTask: EncryptedTask, symmetricKey: SymmetricKey): Promise<string[]> => {

  try {
    return JSON.parse(await decrypt(encryptedTask.timesOfDay, symmetricKey));
  } catch (e) {
    return [];
  }
};

export const decryptRound = async (encryptedRound: EncryptedRound, symmetricKey: SymmetricKey): Promise<Round> => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await decrypt(encryptedRound.timesOfDayCardinality, symmetricKey));
  } catch (e) {
  }

  return {
    name: await decrypt(encryptedRound.name, symmetricKey),
    taskSize: +(await decrypt(encryptedRound.taskSize, symmetricKey) || 0),
    timesOfDay: await Promise.all(encryptedRound.timesOfDay.map(async (timeOfDay) => decrypt(timeOfDay, symmetricKey))),
    timesOfDayCardinality
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, symmetricKey: SymmetricKey): Promise<TodayTask> => {

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    const name = await decrypt(encryptedTimeOfDayName, symmetricKey);
    timesOfDay[name] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
    timesOfDayEncryptedMap[name] = encryptedTimeOfDayName;
  }

  return {
    description: await decrypt(encryptedTodayTask.description, symmetricKey),
    timesOfDay,
    timesOfDayEncryptedMap
  };
};

export const get2BytesArrayBuffer = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length * 2);
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

export const ab2str = (buf) => {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
};

export const str2ab = (str) => {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};
