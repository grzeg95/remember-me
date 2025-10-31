import {firestore} from 'firebase-admin';
import {initializeApp} from 'firebase-admin/app';
import {setGlobalOptions} from 'firebase-functions';

initializeApp();

setGlobalOptions({
  timeoutSeconds: 60,
  memory: '512MiB',
  region: 'europe-central2',
  maxInstances: 10,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 100,
  invoker: 'public',
  enforceAppCheck: true
});

firestore().settings({ ignoreUndefinedProperties: true });

exports.rounds = require('./endpoints/rounds');
exports.tasks = require('./endpoints/tasks');
exports.users = require('./endpoints/users');
exports.auth = require('./endpoints/auth');
