process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const {
  chai, myAuth, myId, firestore, removeUser, getResult, setRoundsOrder, saveRound, decrypt
} = require('../../index');

const expect = chai.expect;
const tests = require('./tests.json');
const {Buffer} = require('buffer');
const {subtle} = require('crypto').webcrypto;

describe(`setRoundsOrder`, async () => {

  let cryptoKey = null;
  let allRoundsIds;

  before(async () => {
    cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(myAuth.auth.token.secretKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt', 'encrypt']
    );
  });

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Some went wrong 🤫 Try again 🙂'
    };

    const result = await getResult(setRoundsOrder, null, null);

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
              const result = await getResult(setRoundsOrder, test, myAuth);
              expect(result).to.eql(expected);
            }).timeout(50000));
          });
        }

      }
    });

    describe(`valid argument`, () => {
      tests.authenticated['valid argument'].forEach((test) => it(JSON.stringify(test), async () => {

        await removeUser(myId);

        allRoundsIds = {};

        const roundsKeysFrom = test['from'].split('');

        // set max rounds to 6 in save-round
        for (let roundKey of roundsKeysFrom) {

          const savedRound = (await getResult(saveRound, {
            roundId: 'null',
            name: 'testowy'
          }, myAuth));

          expect({
            created: true,
            roundId: savedRound.roundId,
            details: 'Your round has been created 😉'
          }).to.eql(savedRound);

          allRoundsIds[roundKey] = savedRound.roundId;
        }

        const result = await getResult(setRoundsOrder, {
          moveBy: test.args[1],
          roundId: allRoundsIds[test.args[0]] || 'null'
        }, myAuth);
        expect(result).to.eql(test.expected);

        const userDocSnap = await firestore.collection('users').doc(myId).get();
        const toCompare = {rounds: JSON.parse(await decrypt(userDocSnap.data().rounds, cryptoKey))};

        expect({
          rounds: test.to.split('').map((roundKey) => allRoundsIds[roundKey])
        }).to.eql(toCompare);
      }).timeout(50000));
    });

  });

});
