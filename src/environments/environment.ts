// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyAd1jkuwewCK3iRcDBPep7kh1HBD9L-aqg',
    authDomain: 'remember-me-3.firebaseapp.com',
    databaseURL: 'https://remember-me-3.firebaseio.com',
    projectId: 'remember-me-3',
    storageBucket: 'remember-me-3.appspot.com',
    messagingSenderId: '824512670781',
    appId: '1:824512670781:web:1deb2cdcdb73bee8'
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
