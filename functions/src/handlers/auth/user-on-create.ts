import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey, webcrypto} from 'crypto';
import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Task} from '../../helpers/models';
import {encrypt, encryptRound, encryptTask} from '../../helpers/security';
import {testRequirement} from '../../helpers/test-requirement';
import {TransactionWrite} from '../../helpers/transaction-write';
import {getUser} from '../../helpers/user';
import {prepareTimesOfDay, proceedTodayTasks} from '../rounds/save-task';

const {getAuth} = require('firebase-admin/auth');
const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

const createSampleUserData = (userDocSnap: firestore.DocumentSnapshot, transaction: firestore.Transaction, cryptoKey: CryptoKey, transactionWrite: TransactionWrite) => {

  let roundDocSnap: firestore.DocumentSnapshot;
  let taskDocSnap: firestore.DocumentSnapshot;
  let roundId: string;

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
  return transaction.get(userDocSnap.ref.collection('rounds').doc()).then((_roundDocSnap) => {

    roundDocSnap = _roundDocSnap;
    roundId = roundDocSnap.id;

    // get task
    return transaction.get(roundDocSnap.ref.collection('task').doc());

  }).then((_taskDocSnap) => {

    taskDocSnap = _taskDocSnap;

    return proceedTodayTasks(transaction, task, taskDocSnap, {
      description: '',
      daysOfTheWeek: [],
      timesOfDay: [],
    }, roundDocSnap, decryptedRound, transactionWrite, cryptoKey);

  }).then((todaysIds) => {

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
  });
};

export const handler = (user: UserRecord) => {

  const key = randomBytes(32);
  let userDocSnap: firestore.DocumentSnapshot;
  let transactionWrite: TransactionWrite;
  let cryptoKey: CryptoKey;
  const app = firestore();

  return app.runTransaction(async (transaction) => {

    if (!publicKey) {
      [publicKey] = await keyManagementServiceClient.getPublicKey({
        name: cryptoKeyVersionPath
      });
    }

    testRequirement(
      publicKey?.name !== cryptoKeyVersionPath ||
      crc32c.calculate(publicKey?.pem) !== Number(publicKey?.pemCrc32c?.value),
      'GetPublicKey: request corrupted in-transit'
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

    return webcrypto.subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    ).then((_cryptoKey) => {
      cryptoKey = _cryptoKey;
      return getAuth().setCustomUserClaims(user.uid, {encryptedSymmetricKey});
    }).then(() => {
      return getUser(app, transaction, user.uid);
    }).then((_userDocSnap: firestore.DocumentSnapshot) => {
      userDocSnap = _userDocSnap;

      // createSampleUserData
      return createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);
    }).then((roundId) => {
      transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
        return {
          rounds,
          hasEncryptedSecretKey: true
        }
      }));

      return transactionWrite.execute();
    });
  }).catch((e) => {
    console.error(e);
    throw new Error(`user ${user.uid} rsa key creation`);
  });
};
