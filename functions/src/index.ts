// DEV
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:/Projects/remember-me/remember-me-dev-6b6dfda4509e.json';
import {initializeApp} from 'firebase-admin/app';

initializeApp();

exports.rounds = require('./handlers/rounds');
exports.roundsv2 = require('./handlers/rounds/v2');

exports.auth = require('./handlers/auth');
exports.authv2 = require('./handlers/auth/v2');

exports.user = require('./handlers/user');
exports.userv2 = require('./handlers/user/v2');
