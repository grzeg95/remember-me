const {firestore} = require('./config');

exports.getUser = async function(userId) {

  const documentRef = firestore.collection('users').doc(userId);
  const result = {};

  async function getDocument(documentRef, result) {

    const docSnap = await documentRef.get();

    result[docSnap.id] = {};
    result[docSnap.id]['fields'] = docSnap.data();

    await documentRef.listCollections().then(async (collections) => {
      result[documentRef.id]['collections'] = {};

      for (let collection of collections) {
        result[documentRef.id]['collections'][collection.id] = {};

        await firestore.collection(collection.path).listDocuments().then(async (docsRef) => {
          for (const docRef of docsRef) {
            await getDocument(docRef, result[documentRef.id]['collections'][collection.id]);
          }
        });
      }
    });
  }

  await getDocument(documentRef, result);

  return result;
}
