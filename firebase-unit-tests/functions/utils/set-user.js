const {firestore} = require('./config');

exports.setUser = async function(uid, doc) {

  async function setDocument(documentRef, doc) {

    await documentRef.set(doc.fields);

    for (const collectionName of Object.keys(doc.collections)) {
      for (const docId of Object.keys(doc.collections[collectionName])) {
        await setDocument(documentRef.collection(collectionName).doc(docId), doc.collections[collectionName][docId]);
      }
    }
  }

  await setDocument(firestore.collection('users').doc(uid), doc);
}
