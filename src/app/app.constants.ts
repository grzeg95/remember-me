type RouterType = 'user' | 'today' | 'tasks-list' | 'task-editor' | 'today-order';

export const RouterDict: {[key in RouterType]: string} = {
  'user': 'u',
  'today': 't',
  'tasks-list': 'l',
  'task-editor': 'e',
  'today-order': 'o'
};
