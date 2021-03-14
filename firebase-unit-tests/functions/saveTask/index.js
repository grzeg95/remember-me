process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, firestore, myId, myAuth, removeUser} = require('../index');

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

describe(`saveTask`, async () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Please login in'
    };

    const result = await getResult(saveTask, null, null);

    expect(result).to.eql(expected);
  });

  describe(`invalid`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    for (const invalidKey in tests['invalid']) {
      if (tests['invalid'].hasOwnProperty(invalidKey)) {
        const invalidCase = tests['invalid'][invalidKey];
        describe(invalidKey, async () => {
          invalidCase.forEach((test) => it(JSON.stringify(test), async () => {
            const result = await getResult(saveTask, test, myAuth);
            expect(result).to.eql(expected);
          }));
        });
      }

    }
  });

  describe(`create`, async () => {

    beforeEach(async () => await removeUser(myId));

    tests['create'].forEach((test) => it(test.name, async () => {
      const x = await getResult(saveTask, test['x'], myAuth);
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      let mustBe = JSON.stringify(test['mustBe']);
      mustBe = mustBe.replace(/{x}/gm, x.taskId);
      mustBe = JSON.parse(mustBe);

      expect(mustBe).to.eql(await getUserJson(myId));
    }));

    afterAll(async () => await removeUser(myId));
  });

  describe(`add`, async () => {

    beforeEach(async () => await removeUser(myId));

    tests['add'].forEach((test) => it(test.name, async () => {
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

  // TODO edit

});
