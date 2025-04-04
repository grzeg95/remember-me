const {
  chai, getUserJson, removeUser, getResult, myContext, getKEmptyRounds, saveRound
} = require('../../index');
const testsInvalid = require('./tests.json');

const myId = myContext.auth.uid;
const expect = chai.expect;

const testCreatingNextEmptyRounds = (i, max, ids) => {
  it(`(${i}/${max})`, async () => {

    const x = await getResult(saveRound, {
      ...myContext,
      data: {
        roundId: 'null',
        name: 'testowy'
      }
    });

    expect({
      created: true,
      details: 'Your round has been created 😉',
      roundId: x.roundId
    }).to.eql(x);

    ids.push({roundId: x.roundId, name: 'testowy'});

    const emptyRounds = getKEmptyRounds(ids);
    const user = await getUserJson(myId);

    expect(user[myId]['fields']['rounds']).to.eql(emptyRounds['rounds']);
    expect(user[myId]['collections']['rounds']).to.eql(emptyRounds['collections']);
  });
};

describe(`saveRound`, async () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'permission-denied',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(saveRound, {});
    expect(result).to.eql(expected);
  });

  describe(`invalid`, async () => {

    testsInvalid['invalid'].forEach((test) => describe(test.name, async () => {

      test['cases'].forEach((testCase) => it(JSON.stringify(testCase), async () => {

        const x = await getResult(saveRound, {
          ...myContext,
          data: testCase
        });
        expect(test['excepted']).to.eql(x);
      }));

    }));
  });

  before(async () => await removeUser(myId));

  describe(`create empty`, async () => {

    const ids = [];
    const maxRounds = 5;
    let i = 0;
    for (; i < maxRounds; ++i) {
      testCreatingNextEmptyRounds(i + 1, maxRounds, ids);
    }

    it(`Too many: (${i + 1}/${maxRounds})`, async () => {

      const x = await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: 'null',
          name: 'testowy'
        }
      });

      expect({
        code: 'invalid-argument',
        details: `You can own ${maxRounds} rounds 🤔`,
        message: 'Bad Request'
      }).to.eql(x);
    });
  });

  describe(`edit`, async () => {

    before(async () => await removeUser(myId));

    it(`create one and rename`, async () => {

      const x = await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: 'null',
          name: 'testowy'
        }
      });

      expect({
        created: true,
        details: 'Your round has been created 😉',
        roundId: x.roundId
      }).to.eql(x);

      const y = await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: x.roundId,
          name: `task_0`
        }
      }, myContext);

      expect(y).to.eql({
        created: false,
        roundId: x.roundId,
        details: 'Your round has been updated 🙃'
      });

      const user = await getUserJson(myId);

      expect(user[myId]['collections']['rounds'][x.roundId]['fields'].name).to.eql(`task_0`);
    });
  });

});
