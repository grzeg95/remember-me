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
      decryptedPrivateKey: "dd21a82ccdb788ee6fbe5c4ac4543d46",
      privateKey: "08ec00e03bc5e29fe7bf61e7cdc5bee4e0e4dc8d8ab040c6e97eb87b07e902d0243bd6d0fd7613557a9c12d20f369aea63e28117e1aace6b78768d91558a7ef95bf5015bc1b9de3fbea3be1d1018eecb5f550f5ecc694e46555cc29cd3fd242090a52440da228887441b2aa955e3db1b4d8ec92ea462148d0b7a83d0e66f089363be63e2c8541c4266eac0d85f6d32d0e1206cd64852cc9b8b86de44f9e9be9ee7ed3f727c728ea5167aba5b0965ce4d9a23e48a9b54484174816cfa83c6e612bcf5836a3fe80124c562769686d79fcef3553b0b9a45f553f15062455bcec39f5031617d9706a48d8b1e1ed62000adeca5f1fef8eaa7f0c7404bad27a20c7ff92307d8f78a5da27cc8a4a613d369bdba50b43d95efe14ee48290a8449ee7e314ee6182c66f5bf67f69021dd3ff368200242ea5dcc95803fff7d35515ffb465c2045f5c62e5697aca8c6764b417e3423141c3ddf5877c45cc2659bfa2f319b5e8ede8c9a00d2250e9f18bf84c11b247ed23fcb12d4d9c449622697d82de5ef089"
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
      obj[documentRef.id]['fields']['rounds'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['rounds'], module.exports.myAuth.auth.token.decryptedPrivateKey));
    }
    if (key === 'name') {
      let name = decrypt(obj[documentRef.id]['fields']['name'], module.exports.myAuth.auth.token.decryptedPrivateKey);
      name = name.substr(1, name.length - 2);
      obj[documentRef.id]['fields']['name'] = name;
    }
    if (key === 'description') {
      let description = decrypt(obj[documentRef.id]['fields']['description'], module.exports.myAuth.auth.token.decryptedPrivateKey);
      description = description.split(/^"(.*)"$/gm)[1] || description;
      obj[documentRef.id]['fields']['description'] = description;
    }
    if (key === 'taskSize') {
      obj[documentRef.id]['fields']['taskSize'] = +decrypt(obj[documentRef.id]['fields']['taskSize'], module.exports.myAuth.auth.token.decryptedPrivateKey);
    }
    if (key === 'timesOfDayCardinality') {
      obj[documentRef.id]['fields']['timesOfDayCardinality'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDayCardinality'], module.exports.myAuth.auth.token.decryptedPrivateKey));
    }
    if (key === 'daysOfTheWeek') {
      obj[documentRef.id]['fields']['daysOfTheWeek'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['daysOfTheWeek'], module.exports.myAuth.auth.token.decryptedPrivateKey));
    }
    if (key === 'timesOfDay') {

      if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'string') {
        obj[documentRef.id]['fields']['timesOfDay'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDay'], module.exports.myAuth.auth.token.decryptedPrivateKey));
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'].map((timeOfDay) => {
          return timeOfDay.split(/^"(.*)"$/gm)[1] || timeOfDay;
        });
      } else if (Array.isArray(obj[documentRef.id]['fields']['timesOfDay'])) {
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'].map((e) => {
          let timeOfDay = decrypt(e, module.exports.myAuth.auth.token.decryptedPrivateKey);
          return timeOfDay.split(/^"(.*)"$/gm)[1] || timeOfDay;
        });
      } else if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'object') {
        const timesOfDay = {};
        for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields']['timesOfDay'])) {
          let keyUnwrapped = decrypt(key, module.exports.myAuth.auth.token.decryptedPrivateKey);
          keyUnwrapped = keyUnwrapped.split(/^"(.*)"$/gm)[1] || keyUnwrapped;
          // console.log({keyUnwrapped});
          timesOfDay[keyUnwrapped] = obj[documentRef.id]['fields']['timesOfDay'][key];
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
