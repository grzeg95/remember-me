process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const test = require('firebase-functions-test')();
const myFunctions = require('../../../../functions/lib/index.js');
const {removeUser} = require('../../utils/remove-user');
const {getUser} = require('../../utils/get-user');
const {expect} = require('../../utils/config');
const {userWithRound} = require("./user-with-round");
const {setUser} = require("../../utils/set-user");
const {userWithRoundUpdated} = require("./user-with-round-updated");
const wrapped = test.wrap(myFunctions.rounds.updateround);

describe('rounds-updateround', function() {

  it(`should update a round name`, async () => {

    await removeUser('myId');

    await setUser('myId', userWithRound);

    const result = await wrapped({
      auth: {
        uid: 'myId'
      },
      data: {
        round: {
          id: userWithRound.fields.roundsIds[0],
          'name': 'My Round Updated'
        }
      }
    });

    const user = await getUser('myId');

    expect(user['myId']).to.deep.equal(userWithRoundUpdated);
  });
});
