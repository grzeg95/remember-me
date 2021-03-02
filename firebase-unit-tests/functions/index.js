// process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
module.exports.admin = require('firebase-admin');
module.exports.admin.initializeApp();
module.exports.test = require('firebase-functions-test')({ projectId: 'remember-me-dev' });
module.exports.chai = require('chai');
module.exports.myFunctions = require('../../functions/lib/functions/src/index');
module.exports.firestore = module.exports.admin.firestore();
module.exports.myId = 'myId';
module.exports.myAuth = { auth: { uid: module.exports.myId } };
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

describe(`My functions tests`, () => {
  require('./setTimesOfDayOrder');
  require('./deleteTask');
});
