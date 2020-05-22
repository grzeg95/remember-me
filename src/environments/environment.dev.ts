export const environment = {
  production: false,
  firebase: {
    projectId: 'remember-me-dev',
    appId: '1:385373027433:web:3caac0255e6a7b91e2b6f8',
    databaseURL: 'https://remember-me-dev.firebaseio.com',
    storageBucket: 'remember-me-dev.appspot.com',
    locationId: 'europe-west2',
    apiKey: 'AIzaSyAJDxhsiwiggRaJ6NI0rNqyXEW_L_qBdxw',
    authDomain: null
  },
  auth0: {
    clientId: '3n8fodkz8xZOEB1C3d7gI130YROBtFaE',
    clientDomain: 'grzeg.eu.auth0.com',
    audience: 'remember-me-dev',
    redirect: '{{origin}}/auth0',
    scope: 'openid profile email'
  },
  functions: {
    dev: false,
    port: null,
    auth0: 'https://europe-west2-remember-me-dev.cloudfunctions.net/auth0'
  }
};
