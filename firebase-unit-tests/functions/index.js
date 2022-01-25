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
      decryptedRsaKey: {
        private: '-----BEGIN RSA PRIVATE KEY-----\n' +
          'MIIG5AIBAAKCAYEAkvvKwB9ILYnlwfXOYivwcDpqolKru3ktTmjElaBHNkZBlTRE\n' +
          'HBvGcyXOmcYty1LpUMM+ElYRAJKm33r9F90nDyaGM0z++dAKyQnhk6KRIp6dfjO7\n' +
          'kAS10Y3hZ/3pnmIlxHC41tFNQW/TY50b6CHqtNm2nyzlbfpcXBtKZc2a99+vUb4C\n' +
          'YrHT4sSema8MREmXrhiWYWbS5f4O/GGlOk5Ph9FgUMof75+XTDuntQFJVOqq2ABB\n' +
          'hpEVFayOjsDaxDLEMq2+Hn4dh6v6mwBGIoqr8ZA8E5Z2sQQYQOjlflSNSUHxWSIQ\n' +
          '5IywOEcRCxumq/PAFaHNdhHi1wy/yV9HJWaF8FMZmvRFkZrj3CORCX9AaWFCC97V\n' +
          'JAUCXt13QZVCf82wjCZCm4mZNqwOCRMRL5iznlYkjvz34zW7bmh7ZN3AFWha84bJ\n' +
          'K+IMg8z1AtPyiuzinJzqDp6fLp5qyyVXEheIyfdKQsZXWLBtDgF3UbbNFODFlyNT\n' +
          'LsBEhiW6fdl2mIetAgMBAAECggGABX/OMin5dVq3ce5Ubm/eaxSEcNZO/pCmFUzu\n' +
          'Lfr1Lx6pzX9LHRIc9qnvdOlpRTYw7IihheYadL8H50yes4nesD5svvaeg5I5FRR9\n' +
          'kByA+Z6dnd8poVXLx69bQ5zIZNifOR5OjBsAnPYmHo/+P00ljuamYoY3f0nisr+C\n' +
          'pRRwO93unUxSooasustIc8+M0fE+75CT78j9EwXSYbb1i5zqdNZsmBk34KtD6eJB\n' +
          'gBAwQjEVe0dnLDW5aDowiz7D8JtFlVjE3wSaxPjBOtD9+N+SS3uSYTd19Lh81i4s\n' +
          'RyZSOsEq2Tcq/QN6e5ligr8q4Rk0mRbELFfc1ISxCh5G6z+I1KRH1pYVfPioVJ6O\n' +
          'sPUvoB2HBo6rmf7y0516RSIDptI5owr56WD6AQwwRyb7gvFHF5AIhkQabVS3j0mO\n' +
          'WROVvMSOTWYD7W8aZ7Suk7dSO71OaG2wopR+D5vPWRRVk0lmZ8hzsv/6bDMGeBD1\n' +
          'T5/+OaXOjJfy5+OkOa0L/6KYJgGBAoHBANayFpYSIHPyBrXjX6D+M+li5ByKIFfv\n' +
          'P4i/aO+IArd5zWb9QdaZNmVFWyVy2qrrFhrflOdBhyooFQhkDizm9gKdk2X03dGH\n' +
          'j0vIOy+kpU02L5KaMu/zg5+VveaoZf0k3vBhEgGBPh33bTRzx8UckckqbWO74Gs6\n' +
          'UiuyyxzDOmkvWFG9Dlv61QfkwQxTmGWhndBxxHozw7lbfOVqRymcLCrHUSIH1OMS\n' +
          'lIs214HAOC6RkDfzKqU9CCg4UsurVJRGGQKBwQCvQtXpJ7rtxdV0H73NZOHJwdI+\n' +
          'r7ZhmKa+h5yTif74/xlBsscZzfFb/9HdIbyGPsb5J5IFaetL2M+g5WXqCwnazNxa\n' +
          'zN2eBj+Mtt2gpy2O5JWY1HyMVlD1ie2z2SbCW+3fxy2kK+r2pkpzz9646ivEjq6T\n' +
          'l+JIC5r06o4uAmyULdToVRNnmY55FDtwP2ryz231647Klw7QhkZW8D131Pka6/SX\n' +
          'YaZbJ8x+rNRfEfOHFs847I5z8rpZnkzlsbSJuLUCgcApDC+JTbnqsRFbYTd9Xlyq\n' +
          'eH/IfRgl99Yb3QzBDy4FykHdOPqHfw+JWTNN+6GXIA8/4BNmC38+Lh+nVQnox9et\n' +
          'NFdkHOb0EojxIj0+pKn+EygRTW4Dtnkp38VI/lVRiuUc7FI2+3DW5eF5L9G3+/hb\n' +
          'j8MOWHNVzPa86BgxTZozVhv6tLy0FUb5lWDbbHgspjO4EKhR/Oek3rsIWcN1Tyia\n' +
          'nTUD3p9zMrA31apqYkfbj3UVXWZ/5SVUG0CpM/6dwrECgcEAif+TVVG+Q0iZ6SSx\n' +
          'G5AKpQVjWY6bib9b0/wN0rI+vKqIpY1ybiQVnr4Q7hCJVB8MJtT8ihy7c+5Uljjq\n' +
          'hV2JtenGvAxBmBMNaOv4GG5qVfAwxrTRGONCPgQL0afzd+hQpfo8Ot+F1A5d41DS\n' +
          '60Efk1ZRqc9XEilpKt2hdCLegdKQqRuL+vATGc1Pe/PDb0rbJ18CAQzuUkzYB86E\n' +
          'Z92fA460+ZmfFnmA8GF/mxgUa9MO+aByDmQaTURzAg1pvWNdAoHBAKZglt1ANMlT\n' +
          '2/qP5rYpgosJR6S/2BFbZiCsFkzyF3+w2Kbav6JeU6bOkCcXzg8nv9UTots/7I1w\n' +
          '38s3P95+8toUgCVWalhCqCt4eCKrfW6GBWyQ9tiXrA6y4qZ27I4zM8vIyZd6ACKb\n' +
          'FCC/1XABebUaH5lAC9JdcCSJu+fq/AaQ43ZGkl0Gu+ytysPoNsESxwLnWSkZ0C9I\n' +
          'IK7nJiiNFFVS234nHuJpWShFaqxEIN579woAjrJ+d6npVLXFO4L38w==\n' +
          '-----END RSA PRIVATE KEY-----',
        public: '-----BEGIN PUBLIC KEY-----\n' +
          'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAkvvKwB9ILYnlwfXOYivw\n' +
          'cDpqolKru3ktTmjElaBHNkZBlTREHBvGcyXOmcYty1LpUMM+ElYRAJKm33r9F90n\n' +
          'DyaGM0z++dAKyQnhk6KRIp6dfjO7kAS10Y3hZ/3pnmIlxHC41tFNQW/TY50b6CHq\n' +
          'tNm2nyzlbfpcXBtKZc2a99+vUb4CYrHT4sSema8MREmXrhiWYWbS5f4O/GGlOk5P\n' +
          'h9FgUMof75+XTDuntQFJVOqq2ABBhpEVFayOjsDaxDLEMq2+Hn4dh6v6mwBGIoqr\n' +
          '8ZA8E5Z2sQQYQOjlflSNSUHxWSIQ5IywOEcRCxumq/PAFaHNdhHi1wy/yV9HJWaF\n' +
          '8FMZmvRFkZrj3CORCX9AaWFCC97VJAUCXt13QZVCf82wjCZCm4mZNqwOCRMRL5iz\n' +
          'nlYkjvz34zW7bmh7ZN3AFWha84bJK+IMg8z1AtPyiuzinJzqDp6fLp5qyyVXEheI\n' +
          'yfdKQsZXWLBtDgF3UbbNFODFlyNTLsBEhiW6fdl2mIetAgMBAAE=\n' +
          '-----END PUBLIC KEY-----'
      },
      encryptedRsaKey: ''
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
      obj[documentRef.id]['fields']['rounds'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['rounds'], module.exports.myAuth.auth.token.decryptedRsaKey));
    }
    if (key === 'name') {
      let name = decrypt(obj[documentRef.id]['fields']['name'], module.exports.myAuth.auth.token.decryptedRsaKey);
      name = name.substr(1, name.length - 2);
      obj[documentRef.id]['fields']['name'] = name;
    }
    if (key === 'description') {
      let description = decrypt(obj[documentRef.id]['fields']['description'], module.exports.myAuth.auth.token.decryptedRsaKey);
      description = description.split(/^"(.*)"$/gm)[1] || description;
      obj[documentRef.id]['fields']['description'] = description;
    }
    if (key === 'taskSize') {
      obj[documentRef.id]['fields']['taskSize'] = +decrypt(obj[documentRef.id]['fields']['taskSize'], module.exports.myAuth.auth.token.decryptedRsaKey);
    }
    if (key === 'timesOfDayCardinality') {
      obj[documentRef.id]['fields']['timesOfDayCardinality'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDayCardinality'], module.exports.myAuth.auth.token.decryptedRsaKey));
    }
    if (key === 'daysOfTheWeek') {
      obj[documentRef.id]['fields']['daysOfTheWeek'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['daysOfTheWeek'], module.exports.myAuth.auth.token.decryptedRsaKey));
    }
    if (key === 'timesOfDay') {

      if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'string') {
        obj[documentRef.id]['fields']['timesOfDay'] = JSON.parse(decrypt(obj[documentRef.id]['fields']['timesOfDay'], module.exports.myAuth.auth.token.decryptedRsaKey));
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'].map((timeOfDay) => {
          return timeOfDay.split(/^"(.*)"$/gm)[1] || timeOfDay;
        });
      } else if (Array.isArray(obj[documentRef.id]['fields']['timesOfDay'])) {
        obj[documentRef.id]['fields']['timesOfDay'] = obj[documentRef.id]['fields']['timesOfDay'].map((e) => {
          let timeOfDay = decrypt(e, module.exports.myAuth.auth.token.decryptedRsaKey);
          return timeOfDay.split(/^"(.*)"$/gm)[1] || timeOfDay;
        });
      } else if (typeof obj[documentRef.id]['fields']['timesOfDay'] === 'object') {
        const timesOfDay = {};
        for (const key of Object.getOwnPropertyNames(obj[documentRef.id]['fields']['timesOfDay'])) {
          let keyUnwrapped = decrypt(key, module.exports.myAuth.auth.token.decryptedRsaKey);
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
