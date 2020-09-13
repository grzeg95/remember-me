export const environment = {
  production: true,
  firebase: {
    projectId: 'remember-me-3',
    appId: '1:824512670781:web:1deb2cdcdb73bee8',
    databaseURL: 'https://remember-me-3.firebaseio.com',
    storageBucket: 'remember-me-3.appspot.com',
    locationId: 'europe-west2',
    apiKey: 'AIzaSyBUnrZ8ADaX8cc7NLoqKe_yruHt0FBTq6c',
    authDomain: 'rem.grzeg.pl'
  },
  functions: {
    dev: false
  },
  emulators: {
    firestore: {
      host: null,
      ssl: false
    },
    functions: {
      host: null
    }
  }
};
