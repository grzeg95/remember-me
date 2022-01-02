process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const {chai, test, myFunctions, getResult, myId, myAuth, getUserJson, removeUser, simplifyUserResult} = require('../../index');

const expect = chai.expect;
const deleteTask = test.wrap(myFunctions.deleteTask);
const saveTask = test.wrap(myFunctions.saveTask);
const tests = require('../saveTask/tests.json');
const testsInvalid = require('./tests.json');
const saveRound = test.wrap(myFunctions.saveRound);

const emptyUser = {
  taskSize: 0,
  timesOfDay: [],
  timesOfDayCardinality: []
}

describe(`deleteTask`, () => {

  let roundId;

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
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
    beforeEach(async () => {
      await removeUser(myId);

      roundId = (await getResult(saveRound, {
        roundId: 'null',
        name: 'testowy'
      }, myAuth)).roundId;
    });

    tests['create'].forEach((test) => it(test.name, async () => {

      const x = await getResult(saveTask, {...test['x'], roundId}, myAuth);
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const deletedResult = await getResult(deleteTask, {taskId: x.taskId, roundId}, myAuth);
      expect({
        details: 'Your task has been deleted 🤭'
      }).to.eql(deletedResult);

      expect(emptyUser).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
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

        roundId = (await getResult(saveRound, {
          roundId: 'null',
          name: 'testowy'
        }, myAuth)).roundId;
        x = await getResult(saveTask, {...test['x'], roundId}, myAuth);
        xId = x.taskId;
        expect({
          created: true,
          details: 'Your task has been created 😉',
          taskId: xId
        }).to.eql(x);
        userWithTaskX = simplifyUserResult(await getUserJson(myId), roundId);

        // store user with task y
        await removeUser(myId);
        roundId = (await getResult(saveRound, {
          roundId: 'null',
          name: 'testowy'
        }, myAuth)).roundId;
        y = await getResult(saveTask, {...test['y'], roundId}, myAuth);
        yId = y.taskId;
        expect({
          created: true,
          details: 'Your task has been created 😉',
          taskId: yId
        }).to.eql(y);
        userWithTaskY = simplifyUserResult(await getUserJson(myId), roundId);
      });

      beforeEach(async () => {
        await removeUser(myId);

        roundId = (await getResult(saveRound, {
          roundId: 'null',
          name: 'testowy'
        }, myAuth)).roundId;

        x = await getResult(saveTask, {...test['x'], roundId}, myAuth);
        y = await getResult(saveTask, {...test['y'], roundId}, myAuth);
      });

      it(`remove x then y`, async () => {

        deletedResult = await getResult(deleteTask, {taskId: x.taskId, roundId}, myAuth);
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
        expect(mustBe).to.eql(simplifyUserResult(await getUserJson(myId), roundId));

        deletedResult = await getResult(deleteTask, {taskId: y.taskId, roundId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyUser).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
      });

      // remove y then x
      it(`remove y then x`, async () => {

        deletedResult = await getResult(deleteTask, {taskId: y.taskId, roundId}, myAuth);
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
        expect(mustBe).to.eql(simplifyUserResult(await getUserJson(myId), roundId));

        deletedResult = await getResult(deleteTask, {taskId: x.taskId, roundId}, myAuth);
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyUser).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
      });

    }));

  });
});
