const {decrypt} = require("../../functions/lib/functions/src/security/security");

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
      decryptedSymmetricKey: 'UUo7Nj8g0QHmvP5FmQEbSTHaq1A9ivy7UUo7Nj8g0QHmvP5FmQEbSTHaq1A9ivy7'
    }
  },
  app: {
    appId: 'lol',
    token: 'lol'
  }
};

module.exports.getResult = async (fn, ...args) => {
  try {
    return await fn(...args);
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

module.exports._getDoc = async (documentRef, obj) => {

  const firestore = module.exports.firestore;

  const docSnap = await documentRef.get();
  obj[documentRef.id] = {};
  obj[documentRef.id]['fields'] = {};
  obj[documentRef.id]['fields'] = docSnap.data();

  for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields'])) {
    if (key === 'rounds') {
      obj[documentRef.id]['fields']['rounds'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['rounds'], module.exports.myAuth.auth.token.decryptedSymmetricKey));
    }
    if (key === 'name') {
      obj[documentRef.id]['fields']['name'] = decrypt(obj[documentRef.id]['fields']['name'], module.exports.myAuth.auth.token.decryptedSymmetricKey);
    }
    if (key === 'description') {
      obj[documentRef.id]['fields']['description'] = decrypt(obj[documentRef.id]['fields']['description'], module.exports.myAuth.auth.token.decryptedSymmetricKey);
    }
    if (key === 'taskSize') {
      obj[documentRef.id]['fields']['taskSize'] = +decrypt(obj[documentRef.id]['fields']['taskSize'], module.exports.myAuth.auth.token.decryptedSymmetricKey);
    }
    if (key === 'timesOfDayCardinality') {
      obj[documentRef.id]['fields']['timesOfDayCardinality'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDayCardinality'], module.exports.myAuth.auth.token.decryptedSymmetricKey));
    }
    if (key === 'daysOfTheWeek') {
      obj[documentRef.id]['fields']['daysOfTheWeek'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['daysOfTheWeek'], module.exports.myAuth.auth.token.decryptedSymmetricKey));
    }
    if (key === 'timesOfDay') {

      if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'string') {
        obj[documentRef.id]['fields']['timesOfDay'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDay'], module.exports.myAuth.auth.token.decryptedSymmetricKey));
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'];
      } else if (Array.isArray(obj[documentRef.id]['fields']['timesOfDay'])) {
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'].map((e) => decrypt(e, module.exports.myAuth.auth.token.decryptedSymmetricKey));
      } else if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'object') {
        const timesOfDay = {};
        for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields']['timesOfDay'])) {
          timesOfDay[decrypt(key, module.exports.myAuth.auth.token.decryptedSymmetricKey)] = obj[documentRef.id]['fields']['timesOfDay'][key];
        }
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
          await module.exports._getDoc(docRef, obj[documentRef.id]['collections'][collection.id]);
        }
      });

    }
  });
};

module.exports.getDoc = async (documentRef) => {
  const obj = {};
  await module.exports._getDoc(documentRef, obj);
  return obj;
};

module.exports.getUserJson = async (userId) => {
  const firestore = module.exports.firestore;
  const documentRef = firestore.collection('users').doc(userId);
  return await module.exports.getDoc(documentRef);
};

module.exports.getEmptyRound = (name) => {
  return {
    fields: {
      timesOfDay: [],
      taskSize: 0,
      timesOfDayCardinality: [],
      name
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
      taskSize: user[myId]['collections']['rounds'][timesOfDayId]['fields']['taskSize'],
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
        const taskSize = simplifyUserResult['today'][todayName]['fields']['taskSize'];

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
          simplifyUserResult['today'][todayName]['taskSize'] = taskSize;
        }
      }
    }

    return simplifyUserResult;
  }

  return {};
};

describe(`My functions tests`, () => {
  require('./rounds/saveRound');
  require('./rounds/saveTask');
  require('./rounds/deleteTask');
  require('./rounds/deleteRound');
  require('./rounds/setTimesOfDayOrder');
});
