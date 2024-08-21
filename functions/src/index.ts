import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const app = initializeApp();

const firestore = getFirestore(app);
firestore.settings({ignoreUndefinedProperties: true});

exports.rounds = require('./handlers/rounds');
// eslint-disable-next-line @typescript-eslint/no-var-requires
exports.roundsHandlersGetters = require('./handlers/rounds/index').handlersGetters;
exports.auth = require('./handlers/auth');
exports.user = require('./handlers/user');
