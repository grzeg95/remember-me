import {https} from '../../config'
import {handler} from '../../tools';

export const deleteTask = https.onRequest((req, resp) =>
  handler(req, resp, require('./delete-task').handler)
);

export const saveTask = https.onRequest((req, resp) =>
  handler(req, resp, require('./save-task').handler)
);

export const setTimesOfDayOrder = https.onRequest((req, resp) =>
  handler(req, resp, require('./set-times-of-day-order').handler)
);

export const saveRound = https.onRequest((req, resp) =>
  handler(req, resp, require('./save-round').handler)
);

export const deleteRound = https.onRequest((req, resp) =>
  handler(req, resp, require('./delete-round').handler, 'text/plain')
);

export const setRoundsOrder = https.onRequest((req, resp) =>
  handler(req, resp, require('./set-rounds-order').handler)
);
