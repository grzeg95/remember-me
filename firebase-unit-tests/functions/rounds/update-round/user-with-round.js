exports.userWithRound = {
  fields: {
    roundsIds: ['0']
  },
  collections: {
    rounds: {
      '0': {
        collections: {},
        fields: {
          name: 'My Round',
          tasksIds: [],
          timesOfDay: [],
          timesOfDayCardinality: []
        }
      }
    }
  }
};
