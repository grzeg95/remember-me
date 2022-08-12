import {APP_INITIALIZER, NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AuthGuard} from './auth/auth-guard.service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';
import {CustomValidators} from './custom-validators';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {initializeAppCheck, ReCaptchaV3Provider} from 'firebase/app-check';
import {initializeApp, getApps, getApp} from 'firebase/app';
import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {getAnalytics} from 'firebase/analytics';

const getFirebaseApp = () => {
  const apps = getApps();

  if (apps.length === 0) {
    return initializeApp(environment.firebase);
  }

  return getApp();
};

export function initializeFirebase(): () => void {
  return () => {

    const app = getFirebaseApp();

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app, environment.firebase.locationId);
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
  };
}

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeFirebase
    },
    {
      provide: 'FUNCTIONS', useValue: getFunctions(getFirebaseApp(), environment.firebase.locationId)
    },
    {
      provide: 'AUTH', useValue: getAuth(getFirebaseApp())
    },
    {
      provide: 'FIRESTORE', useValue: getFirestore(getFirebaseApp())
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}
    },
    AuthService,
    ConnectionService,
    CustomValidators,
    AuthGuard
  ]
})
export class CoreModule {
}
