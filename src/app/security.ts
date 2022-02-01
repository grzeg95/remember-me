import {EncryptedRound, EncryptedTask, EncryptedTodayTask, Round, Task, TodayTask} from './user/models';
import {Buffer} from 'buffer';

export const toBuffer = (ab: ArrayBuffer): Buffer => {
  const buf = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

export const decrypt = async (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  try {
    return toBuffer(await crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv
    }, cryptoKey, encrypted)).toString('utf-8');
  } catch (e) {}

  return null;
};

export const decryptTask = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<Task> => {

  const daysOfTheWeekPromise = decrypt(encryptedTask.daysOfTheWeek, cryptoKey);
  const timesOfDayPromise = decrypt(encryptedTask.timesOfDay, cryptoKey);
  const descriptionPromise = decrypt(encryptedTask.description, cryptoKey);

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(await daysOfTheWeekPromise);
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(await timesOfDayPromise);
  } catch (e) {
  }

  const description = await descriptionPromise;

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptTaskTimesOfDay = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<string[]> => {

  try {
    return JSON.parse(await decrypt(encryptedTask.timesOfDay, cryptoKey));
  } catch (e) {
    return [];
  }
};

export const decryptRound = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<Round> => {

  const namePromise = decrypt(encryptedRound.name, cryptoKey);
  const taskSizePromise = decrypt(encryptedRound.taskSize, cryptoKey);
  const timesOfDayCardinalityPromise = decrypt(encryptedRound.timesOfDayCardinality, cryptoKey);
  const timesOfDayPromise = encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, cryptoKey))

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await timesOfDayCardinalityPromise);
  } catch (e) {
  }

  return {
    name: await namePromise,
    taskSize: +(await taskSizePromise || 0),
    timesOfDay: await Promise.all(timesOfDayPromise),
    timesOfDayCardinality
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    const name = await decrypt(encryptedTimeOfDayName, cryptoKey);
    timesOfDay[name] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
    timesOfDayEncryptedMap[name] = encryptedTimeOfDayName;
  }

  return {
    description: await decrypt(encryptedTodayTask.description, cryptoKey),
    timesOfDay,
    timesOfDayEncryptedMap
  };
};
