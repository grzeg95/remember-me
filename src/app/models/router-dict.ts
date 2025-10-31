type RouterType =
  'todayTasks' |
  'tasksList' |
  'taskEditor' |
  'timesOfDayOrder' |
  'rounds' |
  'roundsList' |
  'roundEditor';

export const RouterDict: {[key in RouterType]: string} = {
  todayTasks: 'tt',
  tasksList: 'tl',
  taskEditor: 'te',
  timesOfDayOrder: 'to',
  rounds: 'r',
  roundsList: 'rl',
  roundEditor: 're'
};
