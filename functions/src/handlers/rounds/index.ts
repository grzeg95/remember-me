import {runWith} from 'firebase-functions';

const region = 'europe-west2';

export const deleteTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./delete-task').handler);

export const saveTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./save-task').handler);

export const setTimesOfDayOrder = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./set-times-of-day-order').handler);

export const saveRound = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./save-round').handler);

export const deleteRound = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./delete-round').handler);
