// @ts-ignore
__webpack_nonce__ = 'random-csp-nonce';

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {getAnalytics} from 'firebase/analytics';
import {FirebaseApp, initializeApp} from 'firebase/app';
import {initializeAppCheck, ReCaptchaV3Provider} from 'firebase/app-check';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import {fetchAndActivate, getRemoteConfig} from 'firebase/remote-config';
import {AppModule} from './app/app.module';
import {FIREBASE_APP} from './app/injectors';
import {environment} from './environments/environment';

const initializeFirebase = (): Promise<FirebaseApp> => {

  return new Promise((resolve) => {

    const promises = [];
    const app = initializeApp(environment.firebase);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const functions = getFunctions(app, environment.firebase.locationId);

    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
    promises.push(fetchAndActivate(remoteConfig));

    getAnalytics(app);

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(environment.recaptcha),
      isTokenAutoRefreshEnabled: true
    });

    if (!environment.production && environment.dev) {
      connectAuthEmulator(auth, `${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`)
      connectFirestoreEmulator(firestore, environment.emulators.firestore.host, environment.emulators.firestore.port);
      connectFunctionsEmulator(
        functions,
        `${environment.emulators.functions.host}`,
        environment.emulators.functions.port
      );
    }

    return Promise.all(promises).then(() => resolve(app)).catch(() => resolve(app));
  });
}

if (environment.production) {
  enableProdMode();
}

initializeFirebase().then((firebaseApp) => {
  return platformBrowserDynamic([
    {
      provide: FIREBASE_APP,
      useValue: firebaseApp
    }
  ]).bootstrapModule(AppModule)
}).catch((err) => console.error(err));
