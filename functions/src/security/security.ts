import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {
  EncryptedRound,
  EncryptedTask,
  EncryptedToday,
  EncryptedTodayTask,
  Round,
  Task,
  Today,
  TodayTask
} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';

const crc32c = require('fast-crc32c');
const crypto = require('crypto');

export interface RsaKey {
  public: string,
  private: string
}

export const decryptRsaKey = async (encryptedRsaKey: string): Promise<RsaKey> => {

  // @ts-ignore
  const ciphertext = new Uint8Array(encryptedRsaKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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

  const privateKey = (decryptResponse.plaintext || '').toString();
  testRequirement(privateKey.length === 0);

  return JSON.parse(privateKey);
};

export const encrypt = (data: any, rsaKey: RsaKey): string => {

  let dataString = '';

  try {
    dataString = JSON.stringify(data);
  } catch (e) {
    dataString = e + '';
  }

  return crypto.publicEncrypt({
    key: rsaKey.public,
    oaepHash: 'sha256',
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, Buffer.from(dataString)).toString('base64');
};

export const decrypt = (data: string, rsaKey: RsaKey): string => {
  return crypto.privateDecrypt({
    key: rsaKey.private,
    oaepHash: 'sha256',
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, Buffer.from(data, 'base64')).toString('utf-8');
};

export const encryptTask = (task: Task, rsaKey: RsaKey): EncryptedTask => {

  const encryptedTask: EncryptedTask = {};

  if (task.description) {
    encryptedTask.description = encrypt(task.description, rsaKey);
  }

  if (task.timesOfDay) {
    encryptedTask.timesOfDay = encrypt(task.timesOfDay, rsaKey);
  }

  if (task.daysOfTheWeek) {
    encryptedTask.daysOfTheWeek = encrypt(task.daysOfTheWeek, rsaKey);
  }

  return encryptedTask;
};

export const decryptTask = (encryptedTask: EncryptedTask, rsaKey: RsaKey): Task => {

  const task: Task = {};

  if (encryptedTask.daysOfTheWeek) {
    task.daysOfTheWeek = JSON.parse(decrypt(encryptedTask.daysOfTheWeek, rsaKey));
  }

  if (encryptedTask.timesOfDay) {
    task.timesOfDay = JSON.parse(decrypt(encryptedTask.timesOfDay, rsaKey));
  }

  if (encryptedTask.description) {
    let description = '';
    description = decrypt(encryptedTask.description, rsaKey);
    description = description.substr(1, description.length - 2);
    task.description = description;
  }

  return task;
};

export const encryptRound = (round: Round, rsaKey: RsaKey): EncryptedRound => {

  const encryptedRound: EncryptedRound = {};

  if (round.name) {
    encryptedRound.name = encrypt(round.name, rsaKey);
  }

  if (round.taskSize) {
    encryptedRound.taskSize = encrypt(round.taskSize, rsaKey);
  }

  if (round.timesOfDayCardinality) {
    encryptedRound.timesOfDayCardinality = encrypt(round.timesOfDayCardinality, rsaKey);
  }

  if (round.timesOfDay) {
    encryptedRound.timesOfDay = round.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, rsaKey));
  }

  return encryptedRound;
};

export const decryptRound = (encryptedRound: EncryptedRound, rsaKey: RsaKey): Round => {

  const round: Round = {};

  if (encryptedRound.name) {
    let name = decrypt(encryptedRound.name, rsaKey);
    name = name.substr(1, name.length - 2);
    round.name = name;
  }

  if (encryptedRound.timesOfDayCardinality) {
    round.timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, rsaKey));
  }

  if (encryptedRound.timesOfDay) {
    round.timesOfDay = encryptedRound.timesOfDay.map((timeOfDay) => {
      const timeOfDayDecrypted = decrypt(timeOfDay, rsaKey);
      return timeOfDayDecrypted.substr(1, timeOfDayDecrypted.length - 2);
    });
  }

  if (encryptedRound.taskSize) {
    round.taskSize = +(decrypt(encryptedRound.taskSize, rsaKey) || 0);
  }

  return round;
};

export const encryptTodayTask = (todayTask: TodayTask, rsaKey: RsaKey): EncryptedTodayTask => {

  const encryptedTodayTask: EncryptedTodayTask = {};

  if (todayTask.timesOfDay) {
    const timesOfDay: { [k in string]: boolean } = {};
    for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
      timesOfDay[encrypt(timeOfDay, rsaKey)] = todayTask.timesOfDay[timeOfDay];
    }
    encryptedTodayTask.timesOfDay = timesOfDay;
  }

  if (todayTask.description) {
    todayTask.description = encrypt(todayTask.description, rsaKey);
  }

  return todayTask;
};

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, rsaKey: RsaKey): TodayTask => {

  const todayTask: TodayTask = {};

  if (encryptedTodayTask.timesOfDay) {
    const timesOfDay: { [k in string]: boolean } = {};
    for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
      timesOfDay[decrypt(encryptedTimeOfDayName, rsaKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
    }
    todayTask.timesOfDay = timesOfDay;
  }

  if (encryptedTodayTask.description) {
    todayTask.description = encrypt(encryptedTodayTask.description, rsaKey);
  }

  return todayTask;
};

export const encryptToday = (today: Today, rsaKey: RsaKey): EncryptedToday => {

  const encryptedToday: EncryptedToday = {};

  if (today.name) {
    encryptedToday.name = encrypt(today.name, rsaKey);
  }

  if (today.taskSize) {
    encryptedToday.taskSize = encrypt(today.taskSize, rsaKey);
  }

  return encryptedToday;
};

export const decryptToday = (encryptedToday: EncryptedToday, rsaKey: RsaKey): Today => {

  const today: Today = {};

  if (encryptedToday.name) {
    let name = decrypt(encryptedToday.name, rsaKey);
    name = name.substr(1, name.length - 2);
    today.name = name;
  }

  if (encryptedToday.taskSize) {
    today.taskSize = +encrypt(encryptedToday.taskSize, rsaKey);
  }

  return today;
};
