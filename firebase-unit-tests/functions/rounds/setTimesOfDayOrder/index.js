process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const {
  chai, myAuth, myId, firestore, removeUser, getResult, decryptRound, setTimesOfDayOrder, saveRound
} = require('../../index');

const expect = chai.expect;
const tests = require('./tests.json');
const {encryptRound} = require("../../../../functions/lib/functions/src/security/security");
const {Buffer} = require("buffer");
const {subtle} = require('crypto').webcrypto;

describe(`setTimesOfDayOrder`, async () => {

  let cryptoKey = null;
  let roundId;

  before(async () => {
    cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(myAuth.auth.token.decryptedSymmetricKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt', 'encrypt']
    );
  })

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
            }).timeout(50000));
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
        const startTimesOfDayCardinality = [...Array(startTimesOfDay.length).keys()].map(e => e + 1);

        await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).set(await encryptRound({
          timesOfDay: startTimesOfDay,
          timesOfDayCardinality: startTimesOfDayCardinality,
          taskSize: 1,
          name: 'lol'
        }, cryptoKey));

        const result = await getResult(setTimesOfDayOrder, {
          timeOfDay: test.args[0],
          moveBy: test.args[1],
          roundId
        }, myAuth);
        expect(result).to.eql(test.expected);

        const roundDocSnap = await firestore.collection('users').doc(myId).collection('rounds').doc(roundId).get();
        const toCompare = await decryptRound(roundDocSnap.data(), cryptoKey);

        const endTimesOfDayCardinality = test.to.split('').map((e) => startTimesOfDayCardinality[startTimesOfDay.indexOf(e)]);

        expect({
          timesOfDay: test.to.split(''),
          timesOfDayCardinality: endTimesOfDayCardinality,
          name: 'lol',
          taskSize: 1
        }).to.eql(toCompare);
      }).timeout(50000));
    });

  });

});
