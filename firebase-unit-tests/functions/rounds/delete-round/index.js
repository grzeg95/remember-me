process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const test = require('firebase-functions-test')();
const myFunctions = require('../../../../functions/lib/index.js');
const {removeUser} = require('../../utils/remove-user');
const {getUser} = require('../../utils/get-user');
const {expect} = require('../../utils/config');
const {userWithRound} = require("./user-with-round");
const {setUser} = require("../../utils/set-user");
const wrapped = test.wrap(myFunctions.rounds.deleteround);

describe('rounds-deleteround', function() {

  it(`should remove a round`, async () => {

    await removeUser('myId');

    await setUser('myId', userWithRound);

    const result = await wrapped({
      auth: {
        uid: 'myId'
      },
      data: {
        round: {
          id: userWithRound.fields.roundsIds[0]
        }
      }
    });

    const user = await getUser('myId');

    expect(user).to.deep.equal({
      ['myId']: {
        collections: {},
        fields: {
          roundsIds: []
        }
      }
    });
  });
});
