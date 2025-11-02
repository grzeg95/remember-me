process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const test = require('firebase-functions-test')();
const myFunctions = require('../../../../functions/lib/index.js');
const {removeUser} = require('../../utils/remove-user');
const {getUser} = require('../../utils/get-user');
const {expect} = require('../../utils/config');
const wrapped = test.wrap(myFunctions.rounds.createround);

describe('rounds-createround', function() {

  it(`should create a round`, async () => {

    await removeUser('myId');

    const result = await wrapped({
      auth: {
        uid: 'myId'
      },
      data: {
        round: {
          name: 'My Round'
        }
      }
    });

    const user = await getUser('myId');

    expect(user['myId']['fields']['roundsIds']).to.deep.equal([result.round.id]);
    expect(user['myId']['collections']['rounds']).to.deep.equal({
      [result.round.id]: {
        collections: {},
        fields: {
          name: 'My Round',
          tasksIds: [],
          timesOfDay: [],
          timesOfDayCardinality: []
        }
      }
    });
  });
});
