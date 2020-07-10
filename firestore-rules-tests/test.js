const firebase = require('@firebase/testing');

const projectId = 'remember-me-dev';
const myId = 'myId';
const theirId = 'theirId';
const myAuth = {
  uid: myId,
  email: 'myEmail'
};

const getFirestore = (auth) => firebase.initializeTestApp({projectId, auth}).firestore();
const getFirestoreAdmin = () => firebase.initializeAdminApp({projectId}).firestore();

describe('auth', () => {

  it(`User can't read other user data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({});
    const userDoc = db.collection('users').doc(theirId);
    await firebase.assertFails(userDoc.get());
  });

  it(`Blocked user can't read other user data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({
      'disabled': true
    });
    const userDoc = db.collection('users').doc(theirId);
    await firebase.assertFails(userDoc.get());
  });

  it(`Not blocked can't read other user data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({
      'disabled': false
    });
    const userDoc = db.collection('users').doc(theirId);
    await firebase.assertFails(userDoc.get());
  });

  it(`Blocked user can't read own data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({
      'disabled': true
    });
    const userDoc = db.collection('users').doc(myId);
    await firebase.assertFails(userDoc.get());
  });

  it(`User can read own data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({});
    const userDoc = db.collection('users').doc(myId);
    await firebase.assertSucceeds(userDoc.get());
  });

  it(`Not blocked user can read own data`, async () => {
    const db = getFirestore(myAuth);
    const dbAdmin = getFirestoreAdmin();
    await dbAdmin.collection('users').doc(myId).set({
      'disabled': false
    });
    const userDoc = db.collection('users').doc(myId);
    await firebase.assertSucceeds(userDoc.get());
  });

});
