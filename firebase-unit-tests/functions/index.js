process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
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
module.exports.removeUser = async (userId) => {
  const firestore = module.exports.firestore;
  const myId = module.exports.myId;
  return firestore.runTransaction(async (transaction) => {
    // read all user shit
    const stackToRemove = [];
    const stackToRead = [];

    stackToRemove.push(transaction.get(firestore.collection('users').doc(myId)).then((docSnap) => docSnap));

    stackToRead.push(firestore.collection('users').doc(userId).listCollections().then(async (collections) => {
      for (let collection of collections) {

        if (collection.id === 'task' || collection.id === 'timesOfDay') {
          stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {
            for (let doc of docs) {
              stackToRemove.push(transaction.get(doc).then((docSnap) => docSnap));
            }
          }));
        }

        if (collection.id === 'today') {
          stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (days) => {

            for (let day of days) {
              stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).listCollections().then(async (dayCollections) => {

                for (let dayCollection of dayCollections) {

                  stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).collection(dayCollection.id).listDocuments().then(async (todayTasks) => {
                    for (let todayTask of todayTasks) {
                      stackToRemove.push(transaction.get(todayTask).then((docSnap) => docSnap));
                    }
                  }));
                }
              }));

            }
          }));
        }
      }

    }));

    for (const toRead of stackToRead) {
      await toRead;
    }

    for (const docToRemove of stackToRemove) {
      transaction.delete((await docToRemove).ref);
    }

  });
};

describe(`My functions tests`, () => {
  require('./setTimesOfDayOrder');
  require('./saveTask');
  require('./deleteTask');
});
