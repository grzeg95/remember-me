process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const {
  getUserJson,
  chai,
  removeUser,
  myId,
  getResult,
  myAuth,
  getKEmptyRounds,
  deleteRound, saveRound, saveTask
} = require('../../index');

const expect = chai.expect;

describe(`deleteRound`, async () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(deleteRound, null, null);

    expect(result).to.eql(expected);
  });

  describe(`invalid`, async () => {

    const invalid = {
      "roundId is not empty string": [
        null, [], {}, "", 0, true
      ]
    };

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    for (const invalidKey in invalid) {
      if (invalid.hasOwnProperty(invalidKey)) {
        const invalidCase = invalid[invalidKey];
        describe(invalidKey, async () => {
          invalidCase.forEach((test) => it(JSON.stringify(test), async () => {
            const result = await getResult(deleteRound, test, myAuth);
            expect(result).to.eql(expected);
          }));
        });
      }
    }
  });

  it(`create one then remove`, async () => {

    await removeUser(myId);

    const x = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: x.roundId
    }).to.eql(x);

    const y = await getResult(deleteRound, x.roundId, myAuth);

    expect(y).to.eql({
      details: 'Your round has been deleted 🤭'
    });

    const user = await getUserJson(myId);
    const emptyRound = getKEmptyRounds([]);

    expect(emptyRound['rounds']).to.eql(user[myId]['fields']['rounds']);
    expect(emptyRound['collections']).to.eql({});
  }).timeout(50000);

  it(`create two then remove one`, async () => {

    await removeUser(myId);

    const z = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    const x = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: x.roundId
    }).to.eql(x);

    const y = await getResult(deleteRound, x.roundId, myAuth);

    expect(y).to.eql({
      details: 'Your round has been deleted 🤭'
    });

    const user = await getUserJson(myId);
    const emptyRound = getKEmptyRounds([{roundId: z.roundId, name: 'testowy'}]);

    expect(emptyRound['rounds']).to.eql(user[myId]['fields']['rounds']);
    expect(emptyRound['collections']).to.eql(user[myId]['collections']['rounds']);
  });

  it(`create two, fill second with 25 tasks then remove`, async () => {

    await removeUser(myId);

    const first = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: first.roundId
    }).to.eql(first);

    const second = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: second.roundId
    }).to.eql(second);

    for (let i = 0; i < 25; ++i) {

      const saveTaskRes = await getResult(saveTask, {
        task: {
          timesOfDay: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
          daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          description: `task_${i}`
        },
        taskId: 'null',
        roundId: second.roundId
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: saveTaskRes.taskId
      }).to.eql(saveTaskRes);
    }

    const deleteRoundRes = await getResult(deleteRound, second.roundId, myAuth);

    expect(deleteRoundRes).to.eql({
      details: 'Your round has been deleted 🤭'
    });

    const user = await getUserJson(myId);
    const emptyRounds = getKEmptyRounds([{roundId: first.roundId, name: 'testowy'}]);

    expect(emptyRounds['rounds']).to.eql(user[myId]['fields']['rounds']);
    expect(emptyRounds['collections']).to.eql(user[myId]['collections']['rounds']);

  }).timeout(50000);

  it(`create two, fill first with 25 tasks then remove`, async () => {

    await removeUser(myId);

    const first = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: first.roundId
    }).to.eql(first);

    const second = await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth);

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: second.roundId
    }).to.eql(second);

    for (let i = 0; i < 25; ++i) {

      const saveTaskRes = await getResult(saveTask, {
        task: {
          timesOfDay: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
          daysOfTheWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          description: `task_${i}`
        },
        taskId: 'null',
        roundId: first.roundId
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: saveTaskRes.taskId
      }).to.eql(saveTaskRes);
    }

    const deleteRoundRes = await getResult(deleteRound, first.roundId, myAuth);

    expect(deleteRoundRes).to.eql({
      details: 'Your round has been deleted 🤭'
    });

    const user = await getUserJson(myId);
    const emptyRounds = getKEmptyRounds([{roundId: second.roundId, name: 'testowy'}]);

    expect(emptyRounds['rounds']).to.eql(user[myId]['fields']['rounds']);
    expect(emptyRounds['collections']).to.eql(user[myId]['collections']['rounds']);

  }).timeout(50000);
});
