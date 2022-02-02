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

  const daysOfTheWeekDecryptPromise = decrypt(encryptedTask.daysOfTheWeek, cryptoKey);
  const timesOfDayDecryptPromise = decrypt(encryptedTask.timesOfDay, cryptoKey);
  const descriptionDecryptPromise = decrypt(encryptedTask.description, cryptoKey);

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(await daysOfTheWeekDecryptPromise);
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(await timesOfDayDecryptPromise);
  } catch (e) {
  }

  const description = await descriptionDecryptPromise;

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptRound = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<Round> => {

  const nameDecryptPromise = decrypt(encryptedRound.name, cryptoKey);
  const taskSizeDecryptPromise = decrypt(encryptedRound.taskSize, cryptoKey);
  const timesOfDayCardinalityDecryptPromise = decrypt(encryptedRound.timesOfDayCardinality, cryptoKey);
  const timesOfDayDecryptPromise = encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, cryptoKey))

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await timesOfDayCardinalityDecryptPromise);
  } catch (e) {
  }

  return {
    name: await nameDecryptPromise,
    taskSize: +(await taskSizeDecryptPromise || 0),
    timesOfDay: await Promise.all(timesOfDayDecryptPromise),
    timesOfDayCardinality
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const descriptionDecryptPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};

  const timeOfDayNamesDecryptPromise = [];
  const encryptedTimeOfDayNames = [];
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timeOfDayNamesDecryptPromise.push(decrypt(encryptedTimeOfDayName, cryptoKey));
    encryptedTimeOfDayNames.push(encryptedTimeOfDayName);
  }
  const timeOfDayNames = await Promise.all(timeOfDayNamesDecryptPromise);

  for (const [i, timeOfDayName] of timeOfDayNames.entries()) {
    timesOfDay[timeOfDayName] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayNames[i]];
    timesOfDayEncryptedMap[timeOfDayName] = encryptedTimeOfDayNames[i];
  }

  return {
    description: await descriptionDecryptPromise,
    timesOfDay,
    timesOfDayEncryptedMap
  };
};
