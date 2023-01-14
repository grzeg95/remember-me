const {
  chai, getResult, myContext, removeUser, getUserJson, saveTask, saveRound,
  simplifyUserResult
} = require('../../index');

const myId = myContext.auth.uid;
const expect = chai.expect;
const tests = require('./tests.json');

describe(`saveTask`, async () => {

  let roundId;

  it(`not authenticated`, async () => {

    const expected = {
      code: 'permission-denied',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(saveTask, {});

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
            const result = await getResult(saveTask, {
              ...myContext,
              data: test
            });
            expect(result).to.eql(expected);
          }));
        });
      }

    }
  });

  it(`every day multiple times[4]`, async () => {

    await removeUser(myId);

    roundId = (await getResult(saveRound, {
      ...myContext,
      data: {
        roundId: 'null',
        name: 'testowy'
      }
    })).roundId;

    const test = tests['every day multiple times'];

    for (let i = 0; i < 4; ++i) {
      await getResult(saveTask, {
        ...myContext,
        data: {
          ...test['x'],
          roundId
        }
      });
    }

    const user = simplifyUserResult(await getUserJson(myId), roundId);

    expect(Object.values(user.today).map((today) => today.name).toSet()).to.eql([
      'wed', 'sun', 'thu', 'tue', 'fri', 'mon', 'sat'
    ].toSet());
  }).timeout(10000);

  describe(`create`, async () => {

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

      let mustBe = JSON.stringify(test['mustBe']);
      mustBe = mustBe.replace(/{x}/gm, x.taskId);
      mustBe = JSON.parse(mustBe);
      mustBe.tasksIds = mustBe.tasksIds.toSet();

      const user = simplifyUserResult(await getUserJson(myId), roundId);
      for (const key of Object.getOwnPropertyNames(user['today'])) {
        const nameOfDayInUser = user['today'][key]['name'];

        mustBe['today'][key] = {
          task: {...mustBe['today'][nameOfDayInUser]['task']},
          name: nameOfDayInUser
        };

        delete mustBe['today'][nameOfDayInUser];
      }

      expect(mustBe).to.eql(user);
    }).timeout(10000));
  });

  describe(`add`, async () => {

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

    tests['add'].forEach((test) => it(test.name, async () => {
      const x = await getResult(saveTask, {
        ...myContext,
        data: {...test['x'], roundId}
      });
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        ...myContext,
        data: {...test['y'], roundId}
      });
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      let mustBe = JSON.stringify(test['mustBe']);
      mustBe = mustBe.replace(/{x}/gm, x.taskId);
      mustBe = mustBe.replace(/{y}/gm, y.taskId);
      mustBe = JSON.parse(mustBe);
      mustBe.tasksIds = mustBe.tasksIds.toSet();

      const user = simplifyUserResult(await getUserJson(myId), roundId);
      for (const key of Object.getOwnPropertyNames(user['today'])) {
        const nameOfDayInUser = user['today'][key]['name'];

        mustBe['today'][key] = {
          task: {...mustBe['today'][nameOfDayInUser]['task']},
          name: nameOfDayInUser
        };

        delete mustBe['today'][nameOfDayInUser];
      }

      expect(mustBe).to.eql(user);
    }).timeout(10000));
  });

  describe(`edit`, async () => {
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

    it('Nothing was changed', async () => {
      const from = await getResult(saveTask, {
        ...myContext,
        data: {...tests['edit-nothing-was-changed']['from'], roundId}
      });
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: from.taskId
      }).to.eql(from);

      let testTo = JSON.stringify(tests['edit-nothing-was-changed']['to']);
      testTo = testTo.replace(/{from}/gm, from.taskId);
      testTo = JSON.parse(testTo);

      const to = await getResult(saveTask, {
        ...myContext,
        data: {...testTo, roundId}
      });
      expect({
        code: 'invalid-argument',
        details: 'Some went wrong 🤫 Try again 🙂',
        message: 'Bad Request'
      }).to.eql(to);
    }).timeout(10000);

    tests['edit'].forEach((test) => it(test.name, async () => {

      const from = await getResult(saveTask, {
        ...myContext,
        data: {...test['from'], roundId}
      });
      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: from.taskId
      }).to.eql(from);

      let testTo = JSON.stringify(test['to']);
      testTo = testTo.replace(/{from}/gm, from.taskId);
      testTo = JSON.parse(testTo);

      const to = await getResult(saveTask, {
        ...myContext,
        data: {...testTo, roundId}
      });
      expect({
        created: false,
        details: 'Your task has been updated 🙃',
        taskId: from.taskId
      }).to.eql(to);

      let mustBe = JSON.stringify(test['mustBe']);
      mustBe = mustBe.replace(/{from}/gm, from.taskId);
      mustBe = JSON.parse(mustBe);
      mustBe.tasksIds = mustBe.tasksIds.toSet();

      const user = simplifyUserResult(await getUserJson(myId), roundId);
      for (const key of Object.getOwnPropertyNames(user['today'])) {

        const nameOfDayInUser = user['today'][key]['name'];

        mustBe['today'][key] = {
          task: {...mustBe['today'][nameOfDayInUser]['task']},
          name: nameOfDayInUser
        };

        delete mustBe['today'][nameOfDayInUser];
      }

      expect(mustBe).to.eql(user);
    }).timeout(10000));
  });
});
