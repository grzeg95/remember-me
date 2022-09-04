// @ts-ignore
__webpack_nonce__ = 'random-csp-nonce';

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FIREBASE_APP} from 'angular-firebase';
import {getAnalytics} from 'firebase/analytics';
import {FirebaseApp, initializeApp} from 'firebase/app';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import {fetchAndActivate, getRemoteConfig} from 'firebase/remote-config';
import {AppModule} from './app/app.module';
import {environment} from './environments/environment';

const initializeFirebase = (): Promise<{app: FirebaseApp}> => {

  return new Promise((resolve) => {

    const promises = [];
    const app = initializeApp(environment.firebase);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const functions = getFunctions(app, environment.functionsRegionOrCustomDomain);

    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
    promises.push(fetchAndActivate(remoteConfig));

    getAnalytics(app);

    if (!environment.production) {
      connectAuthEmulator(auth, `${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`)
      connectFirestoreEmulator(firestore, environment.emulators.firestore.host, environment.emulators.firestore.port);
      connectFunctionsEmulator(
        functions,
        `${environment.emulators.functions.host}`,
        environment.emulators.functions.port
      );
    }

    return Promise.all(promises).then(() => resolve({
      app
    })).catch(() => resolve({
      app
    }));
  });
}

if (environment.production) {
  enableProdMode();
}

initializeFirebase().then((firebaseDependencies) => {
  return platformBrowserDynamic([
    {
      provide: FIREBASE_APP,
      useValue: firebaseDependencies.app
    }
  ]).bootstrapModule(AppModule)
}).catch((err) => console.error(err));
