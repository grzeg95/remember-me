const {
  chai, getResult, myContext, getUserJson, removeUser, simplifyUserResult, deleteTask,
  saveTask, saveRound
} = require('../../index');

const myId = myContext.auth.uid;
const expect = chai.expect;
const tests = require('../saveTask/tests.json');
const testsInvalid = require('./tests.json');

const emptyRound = {
  tasksIds: new Set(),
  timesOfDay: [],
  timesOfDayCardinality: []
}

describe(`deleteTask`, () => {

  let roundId;

  it(`not authenticated`, async () => {

    const expected = {
      code: 'permission-denied',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(deleteTask, {});

    expect(result).to.eql(expected);
  });

  describe(`invalid`, async () => {

    testsInvalid['invalid'].forEach((test) => describe(test.name, async () => {

      test['cases'].forEach((testCase) => it(JSON.stringify(testCase), async () => {
        const x = await getResult(deleteTask, {
          ...myContext,
          data: testCase
        });
        expect(test['excepted']).to.eql(x);
      }));

    }));
  });

  describe(`create then remove`, async () => {
    beforeEach(async () => {
      await removeUser(myId);

      roundId = (await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: 'null',
          name: 'testowy'
        }
      })).roundId;
    });

    tests['create'].forEach((test) => it(test.name, async () => {

      const x = await getResult(saveTask, {
        ...myContext,
        data: {...test['x'], roundId}
      });
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const deletedResult = await getResult(deleteTask, {
        ...myContext,
        data: {taskId: x.taskId, roundId}
      });
      expect({
        details: 'Your task has been deleted 🤭'
      }).to.eql(deletedResult);

      expect(emptyRound).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
    }));
  });

  // add a to b and remove
  // 34 * 2 = 68
  describe(`create (a then b) (remove a then b in two directions)`, async () => {

    let x, y, userWithTaskX, userWithTaskY, deletedResult, xId, yId, mustBe, regex;

    tests['add'].forEach((test) => describe(test.name, async () => {

      // store user with task x
      // store user with task y
      before(async () => {
        // store user with task x
        await removeUser(myId);

        roundId = (await getResult(saveRound, {
          ...myContext,
          data: {
            roundId: 'null',
            name: 'testowy'
          }
        })).roundId;
        x = await getResult(saveTask, {
          ...myContext,
          data: {...test['x'], roundId}
        });
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
          ...myContext,
          data: {
            roundId: 'null',
            name: 'testowy'
          }
        })).roundId;
        y = await getResult(saveTask, {
          ...myContext,
          data: {...test['y'], roundId}
        });
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
          ...myContext,
          data: {
            roundId: 'null',
            name: 'testowy'
          }
        })).roundId;

        x = await getResult(saveTask, {
          ...myContext,
          data: {...test['x'], roundId}
        });
        y = await getResult(saveTask, {
          ...myContext,
          data: {...test['y'], roundId}
        });
      });

      it(`remove x then y`, async () => {

        deletedResult = await getResult(deleteTask, {
          ...myContext,
          data: {taskId: x.taskId, roundId}
        });
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);

        const testRemoveX = test['remove']['x'].split(/(\d+)([^\d.]+)/gm).filter(e => !!e);
        const timesOfDay = testRemoveX.filter((e, i) => i % 2);
        const timesOfDayCardinality = testRemoveX.filter((e, i) => !(i % 2)).map(e => +e);

        userWithTaskY['timesOfDay'] = timesOfDay;
        userWithTaskY['timesOfDayCardinality'] = timesOfDayCardinality;

        mustBe = JSON.stringify(userWithTaskY);
        regex = new RegExp(`${yId}`, 'gm');
        mustBe = mustBe.replace(regex, y.taskId);
        mustBe = JSON.parse(mustBe);
        mustBe.tasksIds = [y.taskId].toSet();

        const user = simplifyUserResult(await getUserJson(myId), roundId);
        const idToReplaceFromUser = Object.getOwnPropertyNames(user.today)[0];
        mustBe.today[idToReplaceFromUser] = {...mustBe.today[Object.getOwnPropertyNames(mustBe.today)[0]]};
        delete mustBe.today[Object.getOwnPropertyNames(mustBe.today)[0]];

        expect(mustBe).to.eql(user);

        deletedResult = await getResult(deleteTask, {
          ...myContext,
          data: {taskId: y.taskId, roundId}
        });
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyRound).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
      }).timeout(50000);

      // remove y then x
      it(`remove y then x`, async () => {

        deletedResult = await getResult(deleteTask, {
          ...myContext,
          data: {taskId: y.taskId, roundId}
        });
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);

        const testRemoveY = test['remove']['y'].split(/(\d+)([^\d.]+)/gm).filter(e => !!e);
        const timesOfDay = testRemoveY.filter((e, i) => i % 2);
        const timesOfDayCardinality = testRemoveY.filter((e, i) => !(i % 2)).map(e => +e);

        userWithTaskX['timesOfDay'] = timesOfDay;
        userWithTaskX['timesOfDayCardinality'] = timesOfDayCardinality;

        mustBe = JSON.stringify(userWithTaskX);
        regex = new RegExp(`${xId}`, 'gm');
        mustBe = mustBe.replace(regex, x.taskId);
        mustBe = JSON.parse(mustBe);
        mustBe.tasksIds = [x.taskId].toSet();

        const user = simplifyUserResult(await getUserJson(myId), roundId);
        const idToReplaceFromUser = Object.getOwnPropertyNames(user.today)[0];
        mustBe.today[idToReplaceFromUser] = {...mustBe.today[Object.getOwnPropertyNames(mustBe.today)[0]]};
        delete mustBe.today[Object.getOwnPropertyNames(mustBe.today)[0]];

        expect(mustBe).to.eql(user);

        deletedResult = await getResult(deleteTask, {
          ...myContext,
          data: {taskId: x.taskId, roundId}
        });
        expect({
          details: 'Your task has been deleted 🤭'
        }).to.eql(deletedResult);
        expect(emptyRound).to.eql(simplifyUserResult(await getUserJson(myId), roundId));
      }).timeout(50000);

    }).timeout(50000));

  }).timeout(50000);
});
