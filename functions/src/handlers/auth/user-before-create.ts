import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey, webcrypto} from 'crypto';
import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {AuthBlockingEvent, BeforeCreateResponse} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Round, RoundDocUncrypded} from '../../models/round';
import {Task} from '../../models/task';
import {User} from '../../models/user';
import {encrypt, encryptRound, encryptTask} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';
import {prepareTimesOfDay, proceedTodayTasks} from '../rounds/save-task';

/* eslint-disable @typescript-eslint/no-var-requires*/

const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

const firestore = getFirestore();

export const createSampleUserData = async (userDocSnap: DocumentSnapshot<User>, transaction: Transaction, cryptoKey: CryptoKey, transactionWrite: TransactionWrite) => {

  const decryptedRound = {
    value: '',
    id: '',
    timesOfDayEncrypted: [],
    timesOfDay: [],
    timesOfDayCardinality: [],
    name: 'Daily',
    todaysIds: [],
    tasksIds: [],
    exists: false
  } as Round;

  const task = {
    timesOfDay: ['Before start'],
    daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    description: 'Drink coffee 🤠'
  } as Task;

  // get round
  const roundRef = Round.ref(userDocSnap.ref);
  const roundDocSnap = await transaction.get(roundRef);

  const roundId = roundDocSnap.id;

  // get task
  const taskRef = Task.ref(roundDocSnap.ref);
  const taskDocSnap = await transaction.get(taskRef);

  const todaysIds = await proceedTodayTasks(transaction, task, taskDocSnap, {
    value: '',
    id: '',
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
    exists: false
  } as Task, roundDocSnap, decryptedRound, transactionWrite, cryptoKey);

  const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, [], ['Before start'], [], []);

  // create round
  transactionWrite.create(roundDocSnap.ref, encryptRound({
    timesOfDay: timesOfDaysToStoreMetadata.timesOfDay,
    timesOfDayCardinality: timesOfDaysToStoreMetadata.timesOfDayCardinality,
    name: 'Daily',
    todaysIds,
    tasksIds: [taskDocSnap.id]
  } as RoundDocUncrypded, cryptoKey));

  transactionWrite.set(taskDocSnap.ref, encryptTask(task, cryptoKey));

  return roundId;
};

export const handler = (event: AuthBlockingEvent) => {

  const key = randomBytes(32);
  let transactionWrite: TransactionWrite;

  return firestore.runTransaction(async (transaction) => {

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

    const userDocSnap = await getUserDocSnap(firestore, transaction, event.data.uid);

    // createSampleUserData
    const roundId = await createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);
    transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
      return {
        rounds,
        hasEncryptedSecretKey: true,
        hasInitialData: true
      } as User;
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
