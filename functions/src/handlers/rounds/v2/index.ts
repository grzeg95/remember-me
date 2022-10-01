import {onRequest} from 'firebase-functions/v2/https';
import {optsV2} from '../../../config';
import {handler} from '../../../tools';

export const deletetask = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../delete-task').handler)
);

export const savetask = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../save-task').handler)
);

export const settimesofdayorder = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../set-times-of-day-order').handler)
);

export const saveround = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../save-round').handler)
);

export const deleteround = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../delete-round').handler, 'text/plain')
);

export const setroundsorder = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../set-rounds-order').handler)
);
