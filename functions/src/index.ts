import {initializeApp} from 'firebase-admin';
import {runWith, auth} from 'firebase-functions';

initializeApp();

const region = 'europe-west2';

export const deleteTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./handlers/delete-task').handler);

export const saveTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./handlers/save-task').handler);

export const setTimesOfDayOrder = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(region).https.onCall(require('./handlers/set-times-of-day-order').handler);

exports.userOnCreate = auth._userWithOptions({
  regions: [region],
  timeoutSeconds: 30,
  memory: '128MB',
  maxInstances: 1
}).onCreate(require('./handlers/user-on-create').handler);
