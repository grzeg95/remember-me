const {firestore} = require('./config');

exports.removeUser = async function(userId) {
  const documentRef = firestore.collection('users').doc(userId);
  await firestore.recursiveDelete(documentRef);
}
