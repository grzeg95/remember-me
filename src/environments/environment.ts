// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    projectId: 'remember-me-3',
    appId: '1:824512670781:web:1deb2cdcdb73bee8',
    databaseURL: 'https://remember-me-3.firebaseio.com',
    storageBucket: 'remember-me-3.appspot.com',
    locationId: 'europe-west2',
    apiKey: 'AIzaSyBUnrZ8ADaX8cc7NLoqKe_yruHt0FBTq6c',
    authDomain: 'rem.grzeg.pl',
    messagingSenderId: '824512670781'
  },
  auth: {
    clientId: 'jKLVgJyx0VjIJcS7FKugtIkmBvNJ5Zys',
    clientDomain: 'grzeg.eu.auth0.com',
    audience: 'http://localhost:4200/',
    redirect: 'http://localhost:4200/auth0',
    scope: 'openid profile email'
  },
  functions: {
    port: 5000
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
