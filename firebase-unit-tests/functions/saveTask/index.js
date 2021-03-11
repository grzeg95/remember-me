process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, firestore, myId, myAuth} = require('../index');

const expect = chai.expect;
const saveTask = test.wrap(myFunctions.saveTask);
const tests = require('./tests.json');

const getUserJson = async (userId) => {
  let user = {};
  const userDocSnap = await firestore.collection('users').doc(userId).get();
  user = {...user, ...userDocSnap.data()}

  await firestore.collection('users').doc(userId).listCollections().then(async (collections) =>  {
    for (let collection of collections) {

      if (collection.id === 'task') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {

          for (let doc of docs) {
            if (!user['task']) {
              user['task'] = {};
            }
            user['task'][doc.id] = (await doc.get()).data();
          }
        });
      }

      if (collection.id === 'timesOfDay') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {

          for (let doc of docs) {
            if (!user['timesOfDay']) {
              user['timesOfDay'] = {};
            }
            user['timesOfDay'][doc.id] = (await doc.get()).data();
          }
        });
      }

      if (collection.id === 'today') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (days) => {

          for (let day of days) {
            await firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).listCollections().then(async (dayCollections) => {

              for (let dayCollection of dayCollections) {

                await firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).collection(dayCollection.id).listDocuments().then(async (todayTasks) => {
                  for (let todayTask of todayTasks) {
                    if (!user[collection.id]) {
                      user[collection.id] = {};
                    }
                    if (!user[collection.id][day.id]) {
                      user[collection.id][day.id] = {};
                    }
                    if (!user[collection.id][day.id][dayCollection.id]) {
                      user[collection.id][day.id][dayCollection.id] = {};
                    }
                    user[collection.id][day.id][dayCollection.id][todayTask.id] = (await todayTask.get()).data();
                  }
                });
              }
            });

          }
        });
      }
    }
  });

  return user;
};

const removeUser = async (userId) => {
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

describe(`saveTask`, async () => {

  describe(`create`, async () => {

    beforeEach(async () => await removeUser(myId));

    it(`x.a -> 1a`, async () => {

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const mustBe = {
        "taskSize": 1,
        "timesOfDaySize": 1,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab -> 1b1a`, async () => {

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const mustBe = {
        "taskSize": 1,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "b",
            "counter": 1
          },
          "b": {
            "next": "a",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              }
            }
          }
        }
      };

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc -> 1c1b1a`, async () => {

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const mustBe = {
        "taskSize": 1,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "b",
            "counter": 1
          },
          "b": {
            "next": "a",
            "prev": "c",
            "counter": 1
          },
          "c": {
            "next": "b",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    afterAll(async () => await removeUser(myId));
  });

  describe(`add`, async () => {

    beforeEach(async () => await removeUser(myId));

    tests['add'].shuffle().forEach((test) => it(test.name, async () => {
      const x = await getResult(saveTask, test['x'], myAuth);
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, test['y'], myAuth);
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      let mustBe = JSON.stringify(test['mustBe']);
      mustBe = mustBe.replace(/{x}/gm, x.taskId);
      mustBe = mustBe.replace(/{y}/gm, y.taskId);
      mustBe = JSON.parse(mustBe);

      expect(mustBe).to.eql(await getUserJson(myId));
    }));

    afterAll(async () => await removeUser(myId));
  });

  // TODO a - b

  // TODO a with days -> LOL it's hard

});
