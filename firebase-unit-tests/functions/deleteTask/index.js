const {chai, test, myFunctions, getResult} = require('../index');

const expect = chai.expect;
const deleteTask = test.wrap(myFunctions.deleteTask);

describe(`deleteTask`, () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Please login in'
    };

    const result = await getResult(deleteTask, null, null);

    expect(result).to.eql(expected);
  });

});
