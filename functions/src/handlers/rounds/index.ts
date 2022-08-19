import {runWith} from 'firebase-functions';
import {regionId} from '../../config'

const https = runWith({
  timeoutSeconds: 60,
  memory: '512MB',
  maxInstances: 10
}).region(regionId).https;

export const deleteTask = https.onCall(require('./save-task').handler);

export const saveTask = https.onCall(require('./save-task').handler);

export const setTimesOfDayOrder = https.onCall(require('./set-times-of-day-order').handler);

export const saveRound = https.onCall(require('./save-round').handler);

export const deleteRound = https.onCall(require('./delete-round').handler);

export const setRoundsOrder = https.onCall(require('./set-rounds-order').handler);
