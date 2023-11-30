import {onCall} from 'firebase-functions/v2/https';
import {beforeUserCreated, beforeUserSignedIn} from 'firebase-functions/v2/identity';
import {blockingOptions, fnBuilder, optsV2} from '../../config';

/* eslint-disable @typescript-eslint/no-var-requires*/

export const gettokenwithsecretkey = onCall(optsV2, require('./get-token-with-secret-key').handler);

const userBuilder = fnBuilder.auth.user();

export const anonymousOnCreate = userBuilder.onCreate(require('./anonymous-on-create').handler);

export const userOnDelete = userBuilder.onDelete(require('./user-on-delete').handler);

export const userbeforesingin = beforeUserSignedIn(blockingOptions, require('./user-before-sign-in').handler);

export const userbeforecreate = beforeUserCreated(blockingOptions, require('./user-before-create').handler);
