const host = 'localhost';
const protocol = 'http';

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
  dev: true,
  emulators: {
    firestore: {
      host,
      port: 9090
    },
    functions: {
      host,
      port: 5000,
      protocol
    },
    auth: {
      host,
      port: 9099,
      protocol
    }
  }
};
