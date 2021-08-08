type RouterType = 'user' | 'today' | 'tasks' | 'task' | 'timesOfDayOrder';

export const RouterDict: {[key in RouterType]: string} = {
  user: 'u',
  today: 't',
  tasks: 'l',
  task: 'e',
  timesOfDayOrder: 'o'
};
