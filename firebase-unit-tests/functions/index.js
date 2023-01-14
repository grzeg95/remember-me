process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
process.env.FUNCTIONS_EMULATOR = 'true';

const {decrypt, decryptRound, encrypt} = require('../../functions/lib/functions/src/tools/security');
const {Buffer} = require('buffer');
const crypto = require('crypto');
const {subtle} = crypto.webcrypto;
const test = require('firebase-functions-test')({projectId: 'remember-me-dev'});
exports.test = test;
exports.chai = require('chai');
const roundsHandlersGetters = require('../../functions/lib/functions/src/index').roundsHandlersGetters;

const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();
exports.firestore = firestore;

const myContext = {
  auth: {
    token: {
      secretKey: crypto.randomBytes(32).toString('hex'),
      email_verified: true
    },
    uid: 'myId'
  },
  app: 'token'
};
exports.myContext = myContext;

exports.decryptRound = decryptRound;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.runTimes = {};
exports.daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
exports.timesOfDay = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];

class RunTime {

  constructor() {
    this.runTimes = [];
    this.timeStart = 0;
  }

  resetTimeStart = () => {
    this.timeStart = Date.now();
  }

  addToRunTime = () => {
    this.runTimes.push((Date.now() - this.timeStart));
  }
}

let cryptoKey = null;
const getCryptoKey = async () => {
  if (!cryptoKey) {
    cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(myContext.auth.token.secretKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  return cryptoKey;
};
exports.getCryptoKey = getCryptoKey;

exports.saveRound = {
  handler: roundsHandlersGetters.getSaveRoundHandler(),
  name: 'saveRound'
};

exports.deleteRound = {
  handler: roundsHandlersGetters.getDeleteRoundHandler(),
  name: 'deleteRound'
};

exports.saveTask = {
  handler: roundsHandlersGetters.getSaveTaskHandler(),
  name: 'saveTask'
};

exports.deleteTask = {
  handler: roundsHandlersGetters.getDeleteTaskHandler(),
  name: 'deleteTask'
};

exports.setTimesOfDayOrder = {
  handler: roundsHandlersGetters.getSetTimesOfDayOrderHandler(),
  name: 'setTimesOfDayOrder'
};

exports.setRoundsOrder = {
  handler: roundsHandlersGetters.getSetRoundsOrderHandler(),
  name: 'setRoundsOrder'
};

exports.getResult = async (fn, context) => {

  try {
    if (!exports.runTimes[fn.name]) {
      exports.runTimes[fn.name] = new RunTime();
    }

    exports.runTimes[fn.name].resetTimeStart();

    const result = (await fn.handler(context)).body;

    exports.runTimes[fn.name].addToRunTime();
    return result;

  } catch (error) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
};

exports.removeUser = async (userId) => {
  const documentRef = firestore.collection('users').doc(userId);
  await firestore.recursiveDelete(documentRef);
};

exports.createUser = async (userId) => {
  await firestore.collection('users').doc(userId).set({
    hasEncryptedSecretKey: true
  });
};

const _getUserAllData = async (documentRef, obj) => {

  const cryptoKey = await getCryptoKey();
  const docSnap = await documentRef.get();
  obj[documentRef.id] = {};
  obj[documentRef.id]['fields'] = {};
  obj[documentRef.id]['fields'] = docSnap.data();

  for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields'])) {

    if (key === 'rounds') {
      obj[documentRef.id]['fields']['rounds'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['rounds'], cryptoKey));
    } else if (key === 'value') {
      obj[documentRef.id]['fields'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['value'], cryptoKey));
    } else if (key === 'description') {
      // maybe decrypted description
      try {
        obj[documentRef.id]['fields']['description'] = await decrypt(obj[documentRef.id]['fields']['description'], cryptoKey);
      } catch (e) {
      }

    } else if (key === 'timesOfDay') {

      if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'string') {
        obj[documentRef.id]['fields']['timesOfDay'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['timesOfDay'], cryptoKey));
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'];
      } else if (Array.isArray(obj[documentRef.id]['fields']['timesOfDay'])) {

        const encryptedTimesOfDayArr = [...obj[documentRef.id]['fields']['timesOfDay']];
        obj[documentRef.id]['fields']['timesOfDay'] = [];

        for (const encryptedTimesOfDay of encryptedTimesOfDayArr) {
          obj[documentRef.id]['fields']['timesOfDay'].push(await decrypt(encryptedTimesOfDay, cryptoKey));
        }

      } else if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'object') {
        const timesOfDay = {};
        for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields']['timesOfDay'])) {
          timesOfDay[await decrypt(key, cryptoKey)] = obj[documentRef.id]['fields']['timesOfDay'][key];
        }
        obj[documentRef.id]['fields']['timesOfDay'] = timesOfDay;
      }
    }

    // todayTask
    else {

      // description
      if (typeof obj[documentRef.id]['fields'][key] === 'string') {
        obj[documentRef.id]['fields'][await decrypt(key, cryptoKey)] = await decrypt(obj[documentRef.id]['fields'][key], cryptoKey);
        delete obj[documentRef.id]['fields'][key];
      } else {
        // timesOfDay
        const timesOfDay = {};
        for (const encryptedTimeOfDay of Object.getOwnPropertyNames(obj[documentRef.id]['fields'][key])) {
          timesOfDay[await decrypt(encryptedTimeOfDay, cryptoKey)] = obj[documentRef.id]['fields'][key][encryptedTimeOfDay];
        }
        delete obj[documentRef.id]['fields'][key];
        obj[documentRef.id]['fields']['timesOfDay'] = timesOfDay;
      }
    }

  }

  await documentRef.listCollections().then(async (collections) => {

    obj[documentRef.id]['collections'] = {};

    for (let collection of collections) {

      obj[documentRef.id]['collections'][collection.id] = {};

      await firestore.collection(collection.path).listDocuments().then(async (docsRef) => {

        for (const docRef of docsRef) {
          await _getUserAllData(docRef, obj[documentRef.id]['collections'][collection.id]);
        }
      });

    }
  });
};

const getUserAllData = async (documentRef) => {
  const obj = {};
  await _getUserAllData(documentRef, obj);
  return obj;
};

const _getDocEncrypted = async (documentRef, obj) => {

  const docSnap = await documentRef.get();
  obj[documentRef.id] = {};
  obj[documentRef.id]['fields'] = {};
  obj[documentRef.id]['fields'] = docSnap.data();

  await documentRef.listCollections().then(async (collections) => {

    obj[documentRef.id]['collections'] = {};

    for (let collection of collections) {

      obj[documentRef.id]['collections'][collection.id] = {};

      await firestore.collection(collection.path).listDocuments().then(async (docsRef) => {

        for (const docRef of docsRef) {
          await _getDocEncrypted(docRef, obj[documentRef.id]['collections'][collection.id]);
        }
      });

    }
  });
};

const getDocEncrypted = async (documentRef) => {
  const obj = {};
  await _getDocEncrypted(documentRef, obj);
  return obj;
};

exports.getUserJsonEncrypted = async (userId) => {
  const documentRef = firestore.collection('users').doc(userId);
  return await getDocEncrypted(documentRef);
};

exports.getUserJson = async (userId) => {
  const documentRef = firestore.collection('users').doc(userId);
  return await getUserAllData(documentRef);
};

const _insertUser = async (docJSON, docRef) => {

  // jestem w kolekcji
  // dodaje dokument
  // jeśli w dokumencie są kolejkcje to dodaje kolejny dokument z tej kolejkcji

  if (Object.getOwnPropertyNames(docJSON['fields']).length) {
    await docRef.set(docJSON['fields']);
  }

  const collections = Object.getOwnPropertyNames(docJSON['collections']);
  if (collections.length) {
    for (const collection of collections) {

      const docsOfCollection = Object.getOwnPropertyNames(docJSON['collections'][collection]);

      if (docsOfCollection.length) {

        for (const docOfCollection of docsOfCollection) {
          await _insertUser(
            docJSON['collections'][collection][docOfCollection],
            docRef.collection(collection).doc(docOfCollection)
          );
        }
      }

    }
  }
};

exports.insertUser = async (docJSON) => {
  const userId = Object.getOwnPropertyNames(docJSON)[0];
  await _insertUser(docJSON[userId], firestore.collection('users').doc(userId));
};

const getEmptyRound = (name) => {
  return {
    fields: {
      timesOfDay: [],
      timesOfDayCardinality: [],
      name,
      todaysIds: [],
      tasksIds: []
    },
    collections: {}
  };
};

exports.getKEmptyRounds = (rounds) => {

  const ids = rounds.map((round) => round.roundId);

  const emptyRounds = {
    rounds: [...ids],
    collections: {}
  };

  for (const round of rounds) {
    emptyRounds.collections[round.roundId] = getEmptyRound(round.name);
  }

  return emptyRounds;
};

exports.simplifyUserResult = (user, roundId) => {

  const myId = myContext.auth.uid;

  if (user[myId]['collections']['rounds']) {
    const simplifyUserResult = {
      tasksIds: user[myId]['collections']['rounds'][roundId]['fields']['tasksIds'].toSet(),
      timesOfDay: user[myId]['collections']['rounds'][roundId]['fields']['timesOfDay'],
      timesOfDayCardinality: user[myId]['collections']['rounds'][roundId]['fields']['timesOfDayCardinality']
    };

    if (user[myId]['collections']['rounds'][roundId]['collections']['task']) {
      simplifyUserResult['task'] = user[myId]['collections']['rounds'][roundId]['collections']['task'];

      for (const taskId of Object.getOwnPropertyNames(simplifyUserResult['task'])) {
        simplifyUserResult['task'][taskId] = {...simplifyUserResult['task'][taskId]['fields']};
      }
    }

    if (user[myId]['collections']['rounds'][roundId]['collections']['today']) {
      simplifyUserResult['today'] = user[myId]['collections']['rounds'][roundId]['collections']['today'];

      for (const todayName of Object.getOwnPropertyNames(simplifyUserResult['today'])) {

        const name = simplifyUserResult['today'][todayName]['fields']['name'];
        const tasksIds = simplifyUserResult['today'][todayName]['fields']['tasksIds'].toSet();

        if (simplifyUserResult['today'][todayName]['collections']['task']) {
          for (const taskId of Object.getOwnPropertyNames(simplifyUserResult['today'][todayName]['collections']['task'])) {
            simplifyUserResult['today'][todayName]['collections']['task'][taskId] = {
              ...simplifyUserResult['today'][todayName]['collections']['task'][taskId]['fields']
            };
          }

          const task = {...simplifyUserResult['today'][todayName]['collections']['task']};
          simplifyUserResult['today'][todayName] = {};

          simplifyUserResult['today'][todayName]['task'] = task;
          simplifyUserResult['today'][todayName]['name'] = name;
        } else {
          simplifyUserResult['today'][todayName] = {};
          simplifyUserResult['today'][todayName]['name'] = name;
          simplifyUserResult['today'][todayName]['tasksIds'] = tasksIds.toSet();
        }
      }
    }

    return simplifyUserResult;
  }

  return {};
};

exports.avg = (values) => {
  if (values.length === 0) throw new Error("No inputs");

  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length) || 0;
}

exports.median = (values) => {
  if (values.length === 0) throw new Error("No inputs");

  values.sort(function (a, b) {
    return a - b;
  });

  const half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const getRandomString = (min, max) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < getRandomIntInclusive(min, max); i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

exports.getRandomDaysOfTheWeek = () => {
  return exports.daysOfTheWeek.shuffle().slice(0, getRandomIntInclusive(1, exports.daysOfTheWeek.length - 1));
};

exports.getRandomTimesOfDay = () => {
  return exports.timesOfDay.shuffle().slice(0, getRandomIntInclusive(1, exports.timesOfDay.length - 1));
};

exports.getRandomDescription = () => {
  return getRandomString(1, 256);
};

exports.getRandomRoundName = () => {
  return getRandomString(1, 256);
};

describe(`My functions tests`, () => {
  require('./rounds/saveRound');
  require('./rounds/saveTask');
  require('./rounds/deleteTask');
  require('./rounds/deleteRound');
  require('./rounds/setTimesOfDayOrder');
  require('./rounds/setRoundsOrder');

  after(() => {
    for (const functionName of Object.getOwnPropertyNames(exports.runTimes)) {
      const runTimes = exports.runTimes[functionName].runTimes;
      console.log('---------------------------');
      console.log(`${functionName}`);
      console.log(`cnt   : ${runTimes.length}`);
      console.log(`median: ${exports.median(runTimes)}`);
      console.log(`avg   : ${exports.avg(runTimes)}`);
    }
  });
});

describe(`My functions benchmarks`, () => {
  require('./rounds/benchmarks/saveTask');
});

// Create random user
// (async () => {
//   await exports.removeUser(myContext.auth.uid);
//   await exports.createUser(myContext.auth.uid);
//
//   for (let i = 0; i < 5; ++i) {
//
//     console.log(i);
//
//     const round = await exports.getResult(exports.saveRound, {
//       ...myContext,
//       data: {
//         roundId: 'null',
//         name: getRandomString(getRandomIntInclusive(100, 256))
//       }
//     });
//
//     for (let j = 0; j < getRandomIntInclusive(15, 25); ++j) {
//
//       console.log(i + ',' + j);
//
//       const timesOfDay = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].shuffle();
//       const daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].shuffle();
//
//       timesOfDay.length = getRandomIntInclusive(5, 10);
//       daysOfTheWeek.length = getRandomIntInclusive(1, 7);
//
//       await exports.getResult(exports.saveTask, {
//         ...myContext,
//         data: {
//           task: {
//             timesOfDay,
//             daysOfTheWeek,
//             description: getRandomString(getRandomIntInclusive(100, 256))
//           },
//           taskId: 'null',
//           roundId: round.roundId
//         }
//       });
//     }
//   }
//
//   const fs = require('fs');
//   fs.writeFileSync('myId.json', JSON.stringify(await exports.getUserJsonEncrypted(myContext.auth.uid)));
// })();
