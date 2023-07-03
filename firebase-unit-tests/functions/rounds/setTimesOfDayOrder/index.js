const {
  chai, myContext, firestore, removeUser, getResult, decryptRound, setTimesOfDayOrder, saveRound, getCryptoKey
} = require('../../index');

const myId = myContext.auth.uid;
const expect = chai.expect;
const tests = require('./tests.json');
const {encryptRound} = require('../../../../functions/lib/tools/security');

describe(`setTimesOfDayOrder`, async () => {

  let cryptoKey = null;
  let roundId;

  before(async () => {
    cryptoKey = await getCryptoKey();
  })

  it(`not authenticated`, async () => {

    const expected = {
      code: 'permission-denied',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(setTimesOfDayOrder,  {});

    expect(result).to.eql(expected);
  });

  describe(`authenticated`, () => {

    describe(`invalid argument`, () => {

      const expected = {
        code: 'invalid-argument',
        message: 'Bad Request',
        details: 'Some went wrong 🤫 Try again 🙂'
      };

      for (const invalidKey in tests['authenticated']['invalid argument']) {
        if (tests['authenticated']['invalid argument'].hasOwnProperty(invalidKey)) {
          const invalidCase = tests['authenticated']['invalid argument'][invalidKey];
          describe(invalidKey, async () => {
            invalidCase.forEach((test) => it(JSON.stringify(test), async () => {
              const result = await getResult(setTimesOfDayOrder, {
                ...myContext,
                data: test
              });
              expect(result).to.eql(expected);
            }).timeout(100000));
          });
        }

      }
    });

    describe(`valid argument`, () => {
      tests.authenticated['valid argument'].forEach((test) => it(JSON.stringify(test), async () => {

        await removeUser(myId);

        roundId = (await getResult(saveRound, {
          ...myContext,
          data: {
            roundId: 'null',
            name: 'testowy'
          }
        })).roundId;

        const startTimesOfDay = test.from.split('');
        const startTimesOfDayCardinality = [...Array(startTimesOfDay.length).keys()].map(e => e + 1);

        await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).set(await encryptRound({
          timesOfDay: startTimesOfDay,
          timesOfDayCardinality: startTimesOfDayCardinality,
          tasksIds: [],
          name: 'lol'
        }, cryptoKey));

        const result = await getResult(setTimesOfDayOrder, {
          ...myContext,
          data: {
            timeOfDay: test.args[0],
            moveBy: test.args[1],
            roundId
          }
        });
        expect(result).to.eql(test.expected);

        const roundDocSnap = await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).get();
        const toCompare = await decryptRound(roundDocSnap.data(), cryptoKey);

        const endTimesOfDayCardinality = test.to.split('').map((e) => startTimesOfDayCardinality[startTimesOfDay.indexOf(e)]);

        expect({
          timesOfDay: test.to.split(''),
          timesOfDayCardinality: endTimesOfDayCardinality,
          name: 'lol',
          tasksIds: []
        }).to.eql(toCompare);
      }).timeout(100000));
    });

  });

});
