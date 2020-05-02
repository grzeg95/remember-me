type RouterType = 'user' | 'today' | 'tasks' | 'task' | 'times-of-day-order';

export const RouterDict: {[key in RouterType]: string} = {
  'user': 'u',
  'today': 't',
  'tasks': 'l',
  'task': 'e',
  'times-of-day-order': 'o'
};
