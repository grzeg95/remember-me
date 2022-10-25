import {initializeApp} from 'firebase-admin/app';
initializeApp();

// for unit tests
exports.roundsHandlers = require('../src/handlers/rounds/index').handlers;

exports.rounds = require('./handlers/rounds');
exports.roundsv2 = require('./handlers/rounds/v2');

exports.auth = require('./handlers/auth');
exports.authv2 = require('./handlers/auth/v2');

exports.user = require('./handlers/user');
exports.userv2 = require('./handlers/user/v2');
