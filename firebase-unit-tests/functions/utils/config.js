const admin = require('firebase-admin');
admin.initializeApp();
exports.firestore = admin.firestore();

const chai = require('chai');
exports.expect = chai.expect;
