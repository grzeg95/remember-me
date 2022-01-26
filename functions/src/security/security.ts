import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {
  EncryptedRound, EncryptedRoundWithoutName, EncryptedRoundWithoutNameAndTaskSize,
  EncryptedTask,
  EncryptedToday,
  EncryptedTodayTask,
  Round, RoundWithoutName, RoundWithoutNameAndTaskSize,
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

  const rsaKey = (decryptResponse.plaintext || '').toString();
  testRequirement(rsaKey.length === 0);

  return JSON.parse(rsaKey);
};

export const encrypt = (data: any, rsaKey: RsaKey): string => {

  let dataString = '';

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
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
  return {
    description: encrypt(task.description, rsaKey),
    timesOfDay: encrypt(task.timesOfDay, rsaKey),
    daysOfTheWeek: encrypt(task.daysOfTheWeek, rsaKey)
  };
};

export const decryptTask = (encryptedTask: EncryptedTask, rsaKey: RsaKey): Task => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(decrypt(encryptedTask.daysOfTheWeek, rsaKey));
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(decrypt(encryptedTask.timesOfDay, rsaKey));
  } catch (e) {
  }

  let description = '';

  try {
    description = decrypt(encryptedTask.description, rsaKey);
  } catch (e) {
  }

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptTaskTimesOfDay = (encryptedTask: EncryptedTask, rsaKey: RsaKey): string[] => {

  try {
    return JSON.parse(decrypt(encryptedTask.timesOfDay, rsaKey));
  } catch (e) {
    return [];
  }
};

export const encryptRound = (round: Round, rsaKey: RsaKey): EncryptedRound => {
  return {
    name: encrypt(round.name, rsaKey),
    taskSize: encrypt(round.taskSize, rsaKey),
    timesOfDayCardinality: encrypt(round.timesOfDayCardinality, rsaKey),
    timesOfDay: round.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, rsaKey))
  };
};

export const encryptRoundWithoutName = (roundWithoutName: RoundWithoutName, rsaKey: RsaKey): EncryptedRoundWithoutName => {
  return {
    taskSize: encrypt(roundWithoutName.taskSize, rsaKey),
    timesOfDayCardinality: encrypt(roundWithoutName.timesOfDayCardinality, rsaKey),
    timesOfDay: roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, rsaKey))
  };
};

export const encryptRoundWithoutNameAndTaskSize = (roundWithoutName: RoundWithoutNameAndTaskSize, rsaKey: RsaKey): EncryptedRoundWithoutNameAndTaskSize => {
  return {
    timesOfDayCardinality: encrypt(roundWithoutName.timesOfDayCardinality, rsaKey),
    timesOfDay: roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, rsaKey))
  };
};

// for unit tests
export const decryptRound = (encryptedRound: EncryptedRound, rsaKey: RsaKey): Round => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, rsaKey))
  } catch (e) {}

  return {
    name: decrypt(encryptedRound.name, rsaKey),
    taskSize: +(decrypt(encryptedRound.taskSize, rsaKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, rsaKey)),
    timesOfDayCardinality
  };
}

export const decryptRoundName = (encryptedRound: EncryptedRound, rsaKey: RsaKey): string => {
  return decrypt(encryptedRound.name, rsaKey);
};

export const decryptRoundWithoutName = (encryptedRound: EncryptedRound, rsaKey: RsaKey): RoundWithoutName => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, rsaKey));
  } catch (e) {
  }

  return {
    taskSize: +(decrypt(encryptedRound.taskSize, rsaKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, rsaKey)),
    timesOfDayCardinality
  };
};

export const decryptRoundWithoutNameAndTaskSize = (encryptedRound: EncryptedRound, rsaKey: RsaKey): RoundWithoutNameAndTaskSize => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, rsaKey));
  } catch (e) {
  }

  return {
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, rsaKey)),
    timesOfDayCardinality
  };
};

export const encryptTodayTask = (todayTask: TodayTask, rsaKey: RsaKey): EncryptedTodayTask => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timesOfDay[encrypt(timeOfDay, rsaKey)] = todayTask.timesOfDay[timeOfDay];
  }

  return {
    description: encrypt(todayTask.description, rsaKey),
    timesOfDay,
  };
};

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, rsaKey: RsaKey): TodayTask => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timesOfDay[decrypt(encryptedTimeOfDayName, rsaKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
  }

  return {
    description: decrypt(encryptedTodayTask.description, rsaKey),
    timesOfDay,
  };
};

export const encryptToday = (today: Today, rsaKey: RsaKey): EncryptedToday => {
  return {
    name: encrypt(today.name, rsaKey),
    taskSize: encrypt(today.taskSize, rsaKey)
  };
};

export const decryptToday = (encryptedToday: EncryptedToday, rsaKey: RsaKey): Today => {
  return {
    name: decrypt(encryptedToday.name, rsaKey),
    taskSize: +decrypt(encryptedToday.taskSize, rsaKey)
  };
};
