export const environment = {
  production: false,
  firebase: {
    projectId: 'remember-me-dev',
    appId: '1:385373027433:web:3caac0255e6a7b91e2b6f8',
    databaseURL: 'https://remember-me-dev.firebaseio.com',
    storageBucket: 'remember-me-dev.appspot.com',
    locationId: 'europe-west2',
    apiKey: 'AIzaSyAJDxhsiwiggRaJ6NI0rNqyXEW_L_qBdxw',
    authDomain: 'dev.rem.grzeg.pl'
  },
  recaptcha: '6LdUQeUdAAAAAGRDJgswQTcGGnyVOtW39O2riMZj',
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
      port: null,
      protocol: null
    }
  }
};
