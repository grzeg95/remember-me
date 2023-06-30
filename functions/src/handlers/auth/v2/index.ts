import {beforeUserCreated, beforeUserSignedIn} from 'firebase-functions/v2/identity';
import {onRequest} from 'firebase-functions/v2/https';
import {blockingOptions, optsV2} from '../../../config';
import {handler} from '../../../tools';

export const gettokenwithsecretkey = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../get-token-with-secret-key').handler, 'text/plain')
);

export const userbeforesingin = beforeUserSignedIn(blockingOptions, require('../user-before-sign-in').handler);

export const userbeforecreate = beforeUserCreated(blockingOptions, require('../user-before-create').handler);
