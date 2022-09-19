import {Response} from 'express';
import {https, runWith} from 'firebase-functions';
import {regionId} from '../../config'
import {handler} from '../../helpers/https-tools';

const httpsFn = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId).https;

export const deleteTask = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./delete-task').handler, {
    contentType: 'application/json'
  })
);

export const saveTask = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./save-task').handler, {
    contentType: 'application/json'
  })
);

export const setTimesOfDayOrder = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./set-times-of-day-order').handler, {
    contentType: 'application/json'
  })
);

export const saveRound = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./save-round').handler, {
    contentType: 'application/json'
  })
);

export const deleteRound = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./delete-round').handler, {
    contentType: 'text/plain'
  })
);

export const setRoundsOrder = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./set-rounds-order').handler, {
    contentType: 'application/json'
  })
);
