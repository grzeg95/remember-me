process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, removeUser, myId, myAuth, firestore, getUserJson} = require('../index');

const expect = chai.expect;
const deleteTask = test.wrap(myFunctions.deleteTask);
const saveTask = test.wrap(myFunctions.saveTask);
const tests = require('../saveTask/tests.json');
const testsInvalid = require('./tests.json');

const emptyUser = {
  taskSize: 0,
  timesOfDay: [],
  timesOfDayCardinality: []
}

describe(`deleteTask`, () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Please login in'
    };

    const result = await getResult(deleteTask, null, null);

    expect(result).to.eql(expected);
  });

  describe(`invalid`, async () => {

    testsInvalid['invalid'].forEach((test) => describe(test.name, async () => {

      test['cases'].forEach((testCase) => it(JSON.stringify(testCase), async () => {
        const x = await getResult(deleteTask, testCase, myAuth);
        expect(test['excepted']).to.eql(x);
      }));

    }));
  });

  describe(`create then remove`, async () => {
    beforeEach(async () => await removeUser(myId));

    tests['create'].forEach((test) => it(test.name, async () => {

      const x = await getResult(saveTask, test['x'], myAuth);
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const deletedResult = await getResult(deleteTask, {taskId: x.taskId}, myAuth);
      expect({
        details: 'Your task has been deleted 🤭'
      }).to.eql(deletedResult);

      expect(emptyUser).to.eql(await getUserJson(myId));
    }));
  })

  // add a to b and remove
  // 34 * 2 = 68
  describe(`create (a then b) (remove a then b in two directions)`, async () => {

    let x,y,userWithTaskX, userWithTaskY,deletedResult,xId,yId,mustBe,regex;

    tests['add'].forEach((test) => describe(test.name, async () => {

      // store user with task x
      // store user with task y
      before(async () => {
        // store user with task x
        await removeUser(myId);
        x = await getResult(saveTask, test['x'], myAuth);
        xId = x.taskId;
        expect({
          created: true,
          details: 'Your task has been created 😉',
          taskId: xId
        }).to.eql(x);
        userWithTaskX = await getUserJson(myId);

        // store user with task y
        await removeUser(myId);
        y = await getResult(saveTask, test['y'], myAuth);
        yId = y.taskId;
        expect({
          created: true,
          details: 'Your task has been created 😉',
          taskId: yId
        }).to.eql(y);
        userWithTaskY = await getUserJson(myId);
      });

      beforeEach(async () => {
        await removeUser(myId);
        x = await getResult(saveTask, test['x'], myAuth);
        y = await getResult(saveTask, test['y'], myAuth);
      });

      it(`remove x then y`, async () => {

        deletedResult = await getResult(deleteTask, {taskId: x.taskId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);

        const testRemoveX = test['remove']['x'].split(/(\d+)([^\d.]+)/gm).filter(e => !!e);
        const timesOfDay = testRemoveX.filter((e, i) => i%2);
        const timesOfDayCardinality = testRemoveX.filter((e, i) => !(i%2)).map(e => +e);

        userWithTaskY['timesOfDay'] = timesOfDay;
        userWithTaskY['timesOfDayCardinality'] = timesOfDayCardinality;

        mustBe = JSON.stringify(userWithTaskY);
        regex = new RegExp(`${yId}`, 'gm');
        mustBe = mustBe.replace(regex, y.taskId);
        mustBe = JSON.parse(mustBe);
        expect(mustBe).to.eql(await getUserJson(myId));

        deletedResult = await getResult(deleteTask, {taskId: y.taskId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyUser).to.eql(await getUserJson(myId));
      });

      // remove y then x
      it(`remove y then x`, async () => {

        deletedResult = await getResult(deleteTask, {taskId: y.taskId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);

        const testRemoveY = test['remove']['y'].split(/(\d+)([^\d.]+)/gm).filter(e => !!e);
        const timesOfDay = testRemoveY.filter((e, i) => i%2);
        const timesOfDayCardinality = testRemoveY.filter((e, i) => !(i%2)).map(e => +e);

        userWithTaskX['timesOfDay'] = timesOfDay;
        userWithTaskX['timesOfDayCardinality'] = timesOfDayCardinality;

        mustBe = JSON.stringify(userWithTaskX);
        regex = new RegExp(`${xId}`, 'gm');
        mustBe = mustBe.replace(regex, x.taskId);
        mustBe = JSON.parse(mustBe);
        expect(mustBe).to.eql(await getUserJson(myId));

        deletedResult = await getResult(deleteTask, {taskId: x.taskId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyUser).to.eql(await getUserJson(myId));
      });

    }));

  });
});
