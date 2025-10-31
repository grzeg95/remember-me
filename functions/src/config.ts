import {runWith} from 'firebase-functions/v1';

export const fnBuilder = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10,
  failurePolicy: true
});
