import {initializeApp} from 'firebase-admin/app';

initializeApp();

export const authorizedDomains = new Set([
  'remember-me-4.firebaseapp.com',
  'remember-me-4.web.app',
  'rem.grzeg.pl',
  'www.rem.grzeg.pl',
  'web-site-yhy2fc7udq-ez.a.run.app',
  'www.web-site-yhy2fc7udq-ez.a.run.app'
]);

exports.rounds = require('./handlers/rounds');
exports.roundsv2 = require('./handlers/rounds/v2');

exports.auth = require('./handlers/auth');
exports.authv2 = require('./handlers/auth/v2');

exports.user = require('./handlers/user');
exports.userv2 = require('./handlers/user/v2');
