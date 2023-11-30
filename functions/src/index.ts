import {initializeApp} from 'firebase-admin/app';

initializeApp();

exports.rounds = require('./handlers/rounds');
// eslint-disable-next-line @typescript-eslint/no-var-requires
exports.roundsHandlersGetters = require('./handlers/rounds/index').handlersGetters;
exports.auth = require('./handlers/auth');
exports.user = require('./handlers/user');
