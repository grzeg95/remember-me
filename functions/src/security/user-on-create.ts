import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
// @ts-ignore
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {prepareTimesOfDay, proceedTodayTasks} from '../handlers/rounds/save-task';
import {testRequirement} from '../helpers/test-requirement';
import {transactionWriteAdd, transactionWriteExecute, TransactionWriteList} from '../helpers/transaction-write';
import {getUser} from '../helpers/user';
import {encrypt, encryptRound, encryptTask} from './security';

const crypto = require('crypto');
const {subtle} = crypto.webcrypto;
const {getAuth} = require('firebase-admin/auth');
const crc32c = require('fast-crc32c');
import DocumentSnapshot = firestore.DocumentSnapshot;
import Transaction = firestore.Transaction;
import {Task} from '../helpers/models';

const createSampleUserData = async (userDocSnap: DocumentSnapshot, transaction: Transaction, cryptoKey: CryptoKey, transactionWriteList: TransactionWriteList) => {

  // get round
  const roundDocSnap: DocumentSnapshot = await transaction.get(userDocSnap.ref.collection('rounds').doc());
  const decryptedRound = {
    timesOfDay: [],
    timesOfDayCardinality: [],
    name: 'Daily',
    todaysIds: [],
    tasksIds: []
  };

  const roundId = roundDocSnap.id;

  // get task
  const taskDocSnap = await transaction.get(roundDocSnap.ref.collection('task').doc());

  const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, [], ['Before start'], [], []);

  const task: Task = {
    timesOfDay: ['Before start'],
    daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    description: 'Drink coffee 🤠'
  };

  const todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  }, roundDocSnap, decryptedRound, transactionWriteList, cryptoKey);

  // create round
  transactionWriteAdd(transaction, transactionWriteList, roundDocSnap.ref, 'create', encryptRound({
    timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
    timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
    name: 'Daily',
    todaysIds,
    tasksIds: [taskDocSnap.id]
  }, cryptoKey));

  transactionWriteAdd(transaction, transactionWriteList, taskDocSnap.ref, 'set', encryptTask(task, cryptoKey));

  return roundId;
};

export const handler = async (user: UserRecord, context: EventContext) => {

  const [publicKey] = await keyManagementServiceClient.getPublicKey({
    name: cryptoKeyVersionPath
  });

  testRequirement(
    publicKey.name !== cryptoKeyVersionPath ||
    crc32c.calculate(publicKey.pem) !== Number(publicKey.pemCrc32c?.value),
    'GetPublicKey: request corrupted in-transit'
  );

  try {

    const key = crypto.randomBytes(32);

    const encryptedSymmetricKey = crypto.publicEncrypt(
      {
        key: publicKey.pem,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      key.toString('hex')
    ).toString('hex');

    const customUserClaims = {
      encryptedSymmetricKey
    };

    const cryptoKey = await subtle.importKey(
      'raw',
      key,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    );

    return getAuth().setCustomUserClaims(user.uid, customUserClaims).then(async () => {

      const app = firestore();

      return app.runTransaction(async (transaction) => {

        const transactionWriteList: TransactionWriteList = {
          value: []
        };

        const userDocSnap = await getUser(app, transaction, user.uid);

        // create simple two number adding test
        const numbers = crypto.randomBytes(2);

        // createSampleUserData
        const roundId =  await createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWriteList);

        const userData = {
          cryptoKeyTest: await encrypt({
            test: [numbers[0], numbers[1]],
            result: numbers[0] + numbers[1]
          }, cryptoKey),
          rounds: await encrypt([roundId], cryptoKey)
        };
        transaction.set(userDocSnap.ref, userData);

        await transactionWriteExecute(transactionWriteList);

        return transaction;
      });
    });
  } catch (e) {
    throw new Error(`user ${user.uid} rsa key creation`);
  }
}
