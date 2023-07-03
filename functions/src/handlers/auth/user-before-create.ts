import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey, webcrypto} from 'crypto';
import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {
  AuthBlockingEvent,
  BeforeCreateResponse
} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Task} from '../../models';
import {encrypt, encryptRound, encryptTask, getUserDocSnap, testRequirement, TransactionWrite} from '../../tools';
import {prepareTimesOfDay, proceedTodayTasks} from '../rounds/save-task';

const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

export const createSampleUserData = async (userDocSnap: DocumentSnapshot, transaction: Transaction, cryptoKey: CryptoKey, transactionWrite: TransactionWrite) => {

  const decryptedRound = {
    timesOfDay: [],
    timesOfDayCardinality: [],
    name: 'Daily',
    todaysIds: [],
    tasksIds: []
  };

  const task: Task = {
    timesOfDay: ['Before start'],
    daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    description: 'Drink coffee 🤠'
  };

  // get round
  const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc());

  const roundId = roundDocSnap.id;

  // get task
  const taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc());

  const todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  }, roundDocSnap, decryptedRound, transactionWrite, cryptoKey);

  const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, [], ['Before start'], [], []);

  // create round
  transactionWrite.create(roundDocSnap.ref, encryptRound({
    timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
    timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
    name: 'Daily',
    todaysIds,
    tasksIds: [taskDocSnap.id]
  }, cryptoKey));

  transactionWrite.set(taskDocSnap.ref, encryptTask(task, cryptoKey));

  return roundId;
};

export const handler = (event: AuthBlockingEvent) => {

  const key = randomBytes(32);
  let transactionWrite: TransactionWrite;
  const app = getFirestore();

  return app.runTransaction(async (transaction) => {

    if (!publicKey) {
      [publicKey] = await keyManagementServiceClient.getPublicKey({
        name: cryptoKeyVersionPath
      });
    }

    testRequirement(
      publicKey?.name !== cryptoKeyVersionPath ||
      crc32c.calculate(publicKey?.pem) !== Number(publicKey?.pemCrc32c?.value),
      {message: 'GetPublicKey: request corrupted in-transit'}
    );

    transactionWrite = new TransactionWrite(transaction);

    const encryptedSymmetricKey = publicEncrypt(
      {
        key: publicKey?.pem,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      } as RsaPublicKey,
      Buffer.from(key.toString('hex'))
    ).toString('hex');

    const cryptoKey = await webcrypto.subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    );

    const userDocSnap = await getUserDocSnap(app, transaction, event.data.uid);

    // createSampleUserData
    const roundId = await createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);
    transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
      return {
        rounds,
        hasEncryptedSecretKey: true
      };
    }));

    await transactionWrite.execute();

    const customClaims: any = {encryptedSymmetricKey};

    return {
      customClaims
    } as BeforeCreateResponse;
  }).catch((e) => {
    console.error(e);
    throw new Error(`user ${event.data.uid} rsa key creation`);
  });
};
