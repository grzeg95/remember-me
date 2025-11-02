exports.userWithRoundUpdated = {
  fields: {
    roundsIds: ['0']
  },
  collections: {
    rounds: {
      '0': {
        collections: {},
        fields: {
          name: 'My Round Updated',
          tasksIds: [],
          timesOfDay: [],
          timesOfDayCardinality: []
        }
      }
    }
  }
};
