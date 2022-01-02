type RouterType =
  'user' |
  'todayTasks' |
  'tasksList' |
  'taskEditor' |
  'timesOfDayOrder' |
  'rounds' |
  'roundsList' |
  'roundEditor';

export const RouterDict: {[key in RouterType]: string} = {
  user: 'u',
  todayTasks: 'tt',
  tasksList: 'tl',
  taskEditor: 'te',
  timesOfDayOrder: 'to',
  rounds: 'r',
  roundsList: 'rl',
  roundEditor: 're'
};
