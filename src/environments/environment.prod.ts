export const environment = {
  production: true,
  firebase: {
    projectId: 'remember-me-4',
    appId: '1:515065185932:web:1e781637e3a85407b65da9',
    databaseURL: 'https://remember-me-4.firebaseio.com',
    storageBucket: 'remember-me-4.appspot.com',
    locationId: 'europe-central2',
    apiKey: 'AIzaSyDGXnFNJ--PlLiuwNLjyEqdJBcFawejhfE',
    authDomain: 'rem.grzeg.pl'
  },
  dev: false,
  emulators: {
    firestore: {
      host: null,
      port: null
    },
    functions: {
      host: null,
      port: null,
      protocol: null
    },
    auth: {
      host: null,
      port: null
    }
  }
};
