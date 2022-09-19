import {Response} from 'express';
import {https, RuntimeOptions, runWith} from 'firebase-functions';
import {regionId} from '../../config';
import {handler} from '../../helpers/https-tools';

const httpsFn = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId).https;

export const getTokenWithSecretKey = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./get-token-with-secret-key').handler, {
    contentType: 'text/plain'
  })
);

const runtimeOptions: RuntimeOptions = {
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
};

const userBuilder = runWith(runtimeOptions).region(regionId).auth.user();

export const anonymousOnCreate = userBuilder.onCreate(require('./anonymous-on-create').handler);

export const userBeforeCreate = userBuilder.beforeCreate(require('./user-before-create').handler);

export const userOnDelete = userBuilder.onDelete(require('./user-on-delete').handler);

export const userBeforeSingIn = userBuilder.beforeSignIn(require('./user-before-sign-in').handler);
