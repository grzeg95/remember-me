import {fnBuilder, https} from '../../config';
import {handler} from '../../tools';

export const getTokenWithSecretKey = https.onRequest((req, resp) =>
  handler(req, resp, require('./get-token-with-secret-key').handler, 'text/plain')
);

const userBuilder = fnBuilder.auth.user();

export const anonymousOnCreate = userBuilder.onCreate(require('./anonymous-on-create').handler);

export const userBeforeCreate = userBuilder.beforeCreate(require('./user-before-create').handler);

export const userOnDelete = userBuilder.onDelete(require('./user-on-delete').handler);

export const userBeforeSingIn = userBuilder.beforeSignIn(require('./user-before-sign-in').handler);
