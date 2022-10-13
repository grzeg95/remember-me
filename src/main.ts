// @ts-ignore
__webpack_nonce__ = 'random-csp-nonce';

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {ANALYTICS, APP_CHECK, AUTH, FIREBASE_APP, FIRESTORE, REMOTE_CONFIG} from 'angular-firebase';
import {environment} from 'environment';
import {Analytics, getAnalytics} from 'firebase/analytics';
import {FirebaseApp, initializeApp} from 'firebase/app';
import {AppCheck, initializeAppCheck, ReCaptchaV3Provider} from 'firebase/app-check';
import {Auth, connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';
import {activate, fetchAndActivate, getRemoteConfig, RemoteConfig} from 'firebase/remote-config';
import {AppModule} from './app/app.module';

const initializeFirebase = (): Promise<{
  app: FirebaseApp,
  analytics: Analytics,
  auth: Auth,
  firestore: Firestore,
  remoteConfig: RemoteConfig
  appCheck: AppCheck
}> => {

  return new Promise((resolve) => {

    const promises = [];
    const app = initializeApp(environment.firebase);
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;

    promises.push(
      fetch(!environment.production ? '/assets/remote-config-default.json' : '/assets/remote-config-default-prod.json').then((res) => {
        return res.json().then((remoteConfigDefault) => {
          remoteConfig.defaultConfig = remoteConfigDefault;
          return activate(remoteConfig);
        });
      }).catch(() => {
      }).then(() => fetchAndActivate(remoteConfig))
    );

    const analytics = getAnalytics(app);

    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(environment.recaptcha),
      isTokenAutoRefreshEnabled: true
    });

    if (!environment.production) {
      connectAuthEmulator(auth, `${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`)
      connectFirestoreEmulator(firestore, environment.emulators.firestore.host, environment.emulators.firestore.port);
    }

    return Promise.all(promises).then(() => resolve({
      app, analytics, auth, firestore, remoteConfig, appCheck
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
    },
    {
      provide: ANALYTICS,
      useValue: firebaseDependencies.analytics
    },
    {
      provide: AUTH,
      useValue: firebaseDependencies.auth
    },
    {
      provide: FIRESTORE,
      useValue: firebaseDependencies.firestore
    },
    {
      provide: REMOTE_CONFIG,
      useValue: firebaseDependencies.remoteConfig
    },
    {
      provide: APP_CHECK,
      useValue: firebaseDependencies.appCheck
    }
  ]).bootstrapModule(AppModule)
}).catch((err) => console.error(err));
