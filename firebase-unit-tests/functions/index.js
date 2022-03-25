const {decrypt, decryptRound, encrypt} = require("../../functions/lib/functions/src/security/security");
const {Buffer} = require("buffer");
const crypto = require('crypto');
const {subtle} = crypto.webcrypto;

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
module.exports.admin = require('firebase-admin');
module.exports.admin.initializeApp();
module.exports.test = require('firebase-functions-test')({projectId: 'remember-me-dev'});
module.exports.chai = require('chai');
module.exports.myFunctions = require('../../functions/lib/functions/src/index');
module.exports.firestore = module.exports.admin.firestore();
module.exports.myId = 'myId';
module.exports.myAuth = {
  auth: {
    uid: module.exports.myId,
    token: {
      decryptedSymmetricKey: crypto.randomBytes(32).toString('hex')
    }
  },
  app: {
    appId: 'lol',
    token: 'lol'
  }
};

module.exports.cryptoKey = null;

module.exports.saveRound = {
  wrapped: module.exports.test.wrap(module.exports.myFunctions.saveRound),
  name: 'saveRound'
};
module.exports.deleteRound = {
  wrapped: module.exports.test.wrap(module.exports.myFunctions.deleteRound),
  name: 'deleteRound'
};
module.exports.saveTask = {
  wrapped: module.exports.test.wrap(module.exports.myFunctions.saveTask),
  name: 'saveTask'
};
module.exports.deleteTask = {
  wrapped: module.exports.test.wrap(module.exports.myFunctions.deleteTask),
  name: 'deleteTask'
};
module.exports.setTimesOfDayOrder = {
  wrapped: module.exports.test.wrap(module.exports.myFunctions.setTimesOfDayOrder),
  name: 'setTimesOfDayOrder'
};

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

module.exports.decryptRound = async (encryptedRound, cryptoKey) => {
  return await decryptRound(encryptedRound, cryptoKey);
};

module.exports.runTimes = {};

module.exports.getResult = async (fn, ...args) => {
  try {
    if (!module.exports.runTimes[fn.name]) {
      module.exports.runTimes[fn.name] = new RunTime();
    }

    module.exports.runTimes[fn.name].resetTimeStart();
    const result = await fn.wrapped(...args);
    module.exports.runTimes[fn.name].addToRunTime();
    return result;

  } catch (error) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
};

module.exports.removeUser = async (userId) => {
  const firestore = module.exports.firestore;
  const documentRef = firestore.collection('users').doc(userId);
  await firestore.recursiveDelete(documentRef);
};

module.exports.createUser = async (userId) => {

  if (!module.exports.cryptoKey) {
    module.exports.cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(module.exports.myAuth.auth.token.decryptedSymmetricKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const firestore = module.exports.firestore;
  const numbers = crypto.randomBytes(2);

  await firestore.collection('users').doc(userId).set({
    cryptoKeyTest: await encrypt({
      test: [numbers[0], numbers[1]],
      result: numbers[0] + numbers[1]
    }, module.exports.cryptoKey)
  });
};

module.exports._getUserAllData = async (documentRef, obj) => {

  if (!module.exports.cryptoKey) {
    module.exports.cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(module.exports.myAuth.auth.token.decryptedSymmetricKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const firestore = module.exports.firestore;

  const docSnap = await documentRef.get();
  obj[documentRef.id] = {};
  obj[documentRef.id]['fields'] = {};
  obj[documentRef.id]['fields'] = docSnap.data();

  for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields'])) {

    if (key === 'rounds') {
      obj[documentRef.id]['fields']['rounds'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['rounds'], module.exports.cryptoKey));
    } else if (key === 'value') {
      obj[documentRef.id]['fields'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['value'], module.exports.cryptoKey));
    } else if (key === 'description') {
      // maybe decrypted description
      try {
        obj[documentRef.id]['fields']['description'] = await decrypt(obj[documentRef.id]['fields']['description'], module.exports.cryptoKey);
      } catch (e){}

    } else if (key === 'timesOfDay') {

      if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'string') {
        obj[documentRef.id]['fields']['timesOfDay'] = JSON.parse(await decrypt(obj[documentRef.id]['fields']['timesOfDay'], module.exports.cryptoKey));
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'];
      } else if (Array.isArray(obj[documentRef.id]['fields']['timesOfDay'])) {

        const encryptedTimesOfDayArr = [...obj[documentRef.id]['fields']['timesOfDay']];
        obj[documentRef.id]['fields']['timesOfDay'] = [];

        for (const encryptedTimesOfDay of encryptedTimesOfDayArr) {
          obj[documentRef.id]['fields']['timesOfDay'].push(await decrypt(encryptedTimesOfDay, module.exports.cryptoKey));
        }

      } else if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'object') {
        const timesOfDay = {};
        for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields']['timesOfDay'])) {
          timesOfDay[await decrypt(key, module.exports.cryptoKey)] = obj[documentRef.id]['fields']['timesOfDay'][key];
        }
        obj[documentRef.id]['fields']['timesOfDay'] = timesOfDay;
      }
    }

    // todayTask
    else {

      // description
      if (typeof obj[documentRef.id]['fields'][key] === 'string') {
        obj[documentRef.id]['fields'][await decrypt(key, module.exports.cryptoKey)] = await decrypt(obj[documentRef.id]['fields'][key], module.exports.cryptoKey);
        delete obj[documentRef.id]['fields'][key];
      } else {
        // timesOfDay
        const timesOfDay = {};
        for (const encryptedTimeOfDay of Object.getOwnPropertyNames(obj[documentRef.id]['fields'][key])) {
          timesOfDay[await decrypt(encryptedTimeOfDay, module.exports.cryptoKey)] = obj[documentRef.id]['fields'][key][encryptedTimeOfDay];
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
          await module.exports._getUserAllData(docRef, obj[documentRef.id]['collections'][collection.id]);
        }
      });

    }
  });
};

module.exports.getUserAllData = async (documentRef) => {
  const obj = {};
  await module.exports._getUserAllData(documentRef, obj);
  return obj;
};

module.exports._getDocEncrypted = async (documentRef, obj) => {

  if (!module.exports.cryptoKey) {
    module.exports.cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(module.exports.myAuth.auth.token.decryptedSymmetricKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const firestore = module.exports.firestore;

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
          await module.exports._getDocEncrypted(docRef, obj[documentRef.id]['collections'][collection.id]);
        }
      });

    }
  });
};

module.exports.getDocEncrypted = async (documentRef) => {
  const obj = {};
  await module.exports._getDocEncrypted(documentRef, obj);
  return obj;
};

module.exports.getUserJsonEncrypted = async (userId) => {
  const firestore = module.exports.firestore;
  const documentRef = firestore.collection('users').doc(userId);
  return await module.exports.getDocEncrypted(documentRef);
};

module.exports.getUserJson = async (userId) => {
  const firestore = module.exports.firestore;
  const documentRef = firestore.collection('users').doc(userId);
  return await module.exports.getUserAllData(documentRef);
};

module.exports._insertUser = async (docJSON, docRef) => {

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
          await module.exports._insertUser(
            docJSON['collections'][collection][docOfCollection],
            docRef.collection(collection).doc(docOfCollection)
          );
        }
      }

    }
  }
};

module.exports.insertUser = async (docJSON) => {
  const firestore = module.exports.firestore;
  const userId = Object.getOwnPropertyNames(docJSON)[0];
  await module.exports._insertUser(docJSON[userId], firestore.collection('users').doc(userId));
};

module.exports.getEmptyRound = (name) => {
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

module.exports.getKEmptyRounds = (rounds) => {

  const ids = rounds.map((round) => round.roundId);

  const emptyRounds = {
    rounds: [...ids],
    collections: {}
  };

  for (const round of rounds) {
    emptyRounds.collections[round.roundId] = module.exports.getEmptyRound(round.name);
  }

  return emptyRounds;
};

module.exports.simplifyUserResult = (user, timesOfDayId) => {

  const myId = module.exports.myId;

  if (user[myId]['collections']['rounds']) {
    const simplifyUserResult = {
      tasksIds: user[myId]['collections']['rounds'][timesOfDayId]['fields']['tasksIds'].toSet(),
      timesOfDay: user[myId]['collections']['rounds'][timesOfDayId]['fields']['timesOfDay'],
      timesOfDayCardinality: user[myId]['collections']['rounds'][timesOfDayId]['fields']['timesOfDayCardinality']
    };

    if (user[myId]['collections']['rounds'][timesOfDayId]['collections']['task']) {
      simplifyUserResult['task'] = user[myId]['collections']['rounds'][timesOfDayId]['collections']['task'];

      for (const taskId of Object.getOwnPropertyNames(simplifyUserResult['task'])) {
        simplifyUserResult['task'][taskId] = {...simplifyUserResult['task'][taskId]['fields']};
      }
    }

    if (user[myId]['collections']['rounds'][timesOfDayId]['collections']['today']) {
      simplifyUserResult['today'] = user[myId]['collections']['rounds'][timesOfDayId]['collections']['today'];

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

module.exports.avg = (values) => {
  if (values.length === 0) throw new Error("No inputs");

  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length) || 0;
}

module.exports.median = (values) => {
  if (values.length === 0) throw new Error("No inputs");

  values.sort(function (a, b) {
    return a - b;
  });

  const half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

module.exports.randomBetween = (a, b) => {
  return Math.random() * (b - a) + a;
}

module.exports.daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
module.exports.timesOfDay = [
  'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'
];

module.exports.getRandomDaysOfTheWeek = () => {
  return module.exports.daysOfTheWeek.shuffle().slice(0, module.exports.randomBetween(1, module.exports.daysOfTheWeek.length - 1));
};

module.exports.getRandomTimesOfDay = () => {
  return module.exports.timesOfDay.shuffle().slice(0, module.exports.randomBetween(1, module.exports.timesOfDay.length - 1));
};

module.exports.getRandomDescription = () => {

  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < module.exports.randomBetween(1, 255); i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

module.exports.getRandomRoundName = () => {

  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < module.exports.randomBetween(1, 100); i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

describe(`My functions tests`, () => {
  require('./rounds/saveRound');
  require('./rounds/saveTask');
  require('./rounds/deleteTask');
  require('./rounds/deleteRound');
  require('./rounds/setTimesOfDayOrder');

  after(() => {
    for (const functionName of Object.getOwnPropertyNames(module.exports.runTimes)) {
      const runTimes = module.exports.runTimes[functionName].runTimes;
      console.log('---------------------------');
      console.log(`${functionName}`);
      console.log(`cnt   : ${runTimes.length}`);
      console.log(`median: ${module.exports.median(runTimes)}`);
      console.log(`avg   : ${module.exports.avg(runTimes)}`);
    }
  });
});

describe(`My functions benchmarks`, () => {
  require('./rounds/benchmarks/saveTask');
});
