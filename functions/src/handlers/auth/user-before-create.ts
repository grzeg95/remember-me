import {google} from '@google-cloud/kms/build/protos/protos';
import {constants, publicEncrypt, randomBytes, RsaPublicKey/* , webcrypto */} from 'crypto';
import {DocumentSnapshot, getFirestore, Transaction} from 'firebase-admin/firestore';
import {
  AuthBlockingEvent,
  BeforeCreateResponse
} from 'firebase-functions/lib/common/providers/identity';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../../config';
import {Round, RoundDoc} from '../../models/round';
import {User, UserDoc} from '../../models/user';
import {encrypt} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';
import {prepareTimesOfDay, proceedTodayTasks} from '../rounds/save-task';
import {Task, TaskDoc} from '../../models/task';

/* eslint-disable @typescript-eslint/no-var-requires*/

const crc32c = require('fast-crc32c');

let publicKey: google.cloud.kms.v1.IPublicKey | null;

export const createSampleUserData = async (userDocSnap: DocumentSnapshot<User, UserDoc>, transaction: Transaction, cryptoKey: CryptoKey, transactionWrite: TransactionWrite) => {

  const encryptedName = await encrypt('Daily', cryptoKey);
  const decryptedRound = new Round('null', [], [], [], [], 'Daily', encryptedName, false);

  const encryptedDescription = await encrypt('Drink coffee 🤠', cryptoKey);
  const encryptedDaysOfTheWeek = await encrypt(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], cryptoKey);
  const task: Task = new Task('null', encryptedDescription, 'Drink coffee 🤠', ['Before start'], encryptedDaysOfTheWeek, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], false);

  // get round
  const roundRef = Round.ref(userDocSnap.ref);
  const roundDocSnap = await transaction.get(roundRef);

  const roundId = roundDocSnap.id;

  // get task
  const taskRef = Task.ref(roundDocSnap.ref);
  const taskDocSnap = await transaction.get(taskRef);

  const todayIds = await proceedTodayTasks(transaction, task, taskDocSnap, task, roundDocSnap, decryptedRound, transactionWrite, cryptoKey);

  const timesOfDaysToStoreMetadata = prepareTimesOfDay(transaction, [], ['Before start'], [], []);

  // create round
  transactionWrite.create(roundDocSnap.ref, {
    encryptedName,
    timesOfDayIds: timesOfDaysToStoreMetadata.timesOfDayIds,
    timesOfDayIdsCardinality: timesOfDaysToStoreMetadata.timesOfDayIdsCardinality,
    todayIds,
    tasksIds: [taskDocSnap.id]
  } as RoundDoc);

  transactionWrite.set(taskDocSnap.ref, {
    encryptedDaysOfTheWeek,
    encryptedDescription,
    timesOfDayIds: task.timesOfDayIds
  } as TaskDoc);

  return roundId;
};

export const handler = async (event: AuthBlockingEvent) => {

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

  const key = randomBytes(32);
  const app = getFirestore();

  const encryptedSymmetricKey = publicEncrypt(
    {
      key: publicKey?.pem,
      oaepHash: 'sha256',
      padding: constants.RSA_PKCS1_OAEP_PADDING
    } as RsaPublicKey,
    Buffer.from(key.toString('hex'))
  ).toString('hex');

  // const cryptoKey = await webcrypto.subtle.importKey(
  //   'raw',
  //   key,
  //   {
  //     name: 'AES-GCM'
  //   },
  //   false,
  //   ['encrypt']
  // );

  return app.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(app, transaction, event.data.uid);

    // createSampleUserData
    // const roundId = await createSampleUserData(userDocSnap, transaction, cryptoKey, transactionWrite);
    // transactionWrite.set(userDocSnap.ref, encrypt([roundId], cryptoKey).then((rounds) => {
    //   return {
    //     rounds,
    //     hasEncryptedSecretKey: true
    //   };
    // }));

    transactionWrite.set(userDocSnap.ref, {
      roundsIds: [] as string[],
      hasEncryptedSecretKey: true
    } as UserDoc);

    await transactionWrite.execute();

    const customClaims = {encryptedSymmetricKey};

    return {
      customClaims
    } as BeforeCreateResponse;

  }).catch((e) => {
    console.error(e);
    throw new Error(`user ${event.data.uid} rsa key creation`);
  });
};
