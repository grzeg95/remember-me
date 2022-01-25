process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const {chai, test, myFunctions, myAuth, myId, firestore, removeUser, getResult} = require('../../index');

const expect = chai.expect;
const tests = require('./tests.json');
const {encryptRound, decryptRound} = require("../../../../functions/lib/functions/src/security/security");
const setTimesOfDayOrder = test.wrap(myFunctions.setTimesOfDayOrder);
const saveRound = test.wrap(myFunctions.saveRound);

describe(`setTimesOfDayOrder`, () => {

  let roundId;

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(setTimesOfDayOrder, null, null);

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
              const result = await getResult(setTimesOfDayOrder, test, myAuth);
              expect(result).to.eql(expected);
            }));
          });
        }

      }
    });

    describe(`valid argument`, () => {
      tests.authenticated['valid argument'].forEach((test) => it(JSON.stringify(test), async () => {

        await removeUser(myId);

        roundId = (await getResult(saveRound, {
          roundId: 'null',
          name: 'testowy'
        }, myAuth)).roundId;

        const startTimesOfDay = test.from.split('');
        const startTimesOfDayCardinality = [...Array(startTimesOfDay.length).keys()].map(e => e+1);

        await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).set(encryptRound({
          timesOfDay: startTimesOfDay,
          timesOfDayCardinality: startTimesOfDayCardinality,
          taskSize: 1,
          name: 'lol'
        }, myAuth.auth.token.decryptedRsaKey));

        const result = await getResult(setTimesOfDayOrder, {timeOfDay: test.args[0], moveBy: test.args[1], roundId}, myAuth);
        expect(result).to.eql(test.expected);

        const roundDocSnap = await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).get();
        const toCompare = decryptRound(roundDocSnap.data(), myAuth.auth.token.decryptedRsaKey);

        const endTimesOfDayCardinality = test.to.split('').map((e) => startTimesOfDayCardinality[startTimesOfDay.indexOf(e)]);

        expect({
          timesOfDay: test.to.split(''),
          timesOfDayCardinality: endTimesOfDayCardinality,
          name: 'lol',
          taskSize: 1
        }).to.eql(toCompare);
      }));
    });

  });

});
