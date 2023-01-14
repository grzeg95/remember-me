const {
  removeUser, getResult, saveRound, myContext, saveTask, deleteRound, runTimes, median, avg,
  getRandomTimesOfDay, getRandomDaysOfTheWeek, getRandomDescription, getUserJsonEncrypted, insertUser,
  getRandomRoundName
} = require('../../../index');

const myId = myContext.auth.uid;

describe(`deleteRound`, async function () {

  this.timeout(100000);

  // create 10 rounds
  // fill with 20 random tasks

  const roundsId = [];
  let user;

  before(async () => {
    console.log('removeUser');
    await removeUser(myId);
    // await createUser(myId);

    for (let i = 0; i < 5; ++i) {
      console.log(`round: ${i}`);
      const roundId = (await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: 'null',
          name: getRandomRoundName()
        }
      })).roundId;

      roundsId.push(roundId);

      for (let j = 0; j < 20; ++j) {
        (await getResult(saveTask, {
          ...myContext,
          data: {
            task: {
              timesOfDay: getRandomTimesOfDay(),
              daysOfTheWeek: getRandomDaysOfTheWeek(),
              description: getRandomDescription()
            },
            taskId: "null",
            roundId
          }
        }));
      }
    }

    // get user
    console.log('getUserJsonEncrypted');
    user = await getUserJsonEncrypted(myId);
    // console.log(JSON.stringify(user));
  });

  for (let i = 0; i < 50; ++i) {
    it(`run`, async () => {

      await removeUser(myId);
      await insertUser(user);

      // delete all of rounds
      for (const roundId of roundsId) {
        await getResult(deleteRound, {
          ...myContext,
          data: roundId
        });
      }
    }).timeout(100000);
  }

  after(() => {
    for (const functionName of Object.getOwnPropertyNames(runTimes)) {
      const runTime = runTimes[functionName].runTimes;
      console.log('---------------------------');
      console.log(`${functionName}`);
      console.log(`cnt   : ${runTime.length}`);
      console.log(`median: ${median(runTime)}`);
      console.log(`avg   : ${avg(runTime)}`);
    }
  });
});
