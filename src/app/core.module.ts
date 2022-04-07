import {APP_INITIALIZER, NgModule} from '@angular/core';
import {initializeAppCheck, ReCaptchaV3Provider} from '@angular/fire/app-check';
import {AngularFireFunctions, REGION} from '@angular/fire/compat/functions';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {USE_EMULATOR as USE_FIRESTORE_EMULATOR} from '@angular/fire/compat/firestore';
import {CustomValidators} from './custom-validators';
import {ExtraParametersGuard} from './extra-parameters-guard.service';

export function initializeEmulators(afAuth: AngularFireAuth, fns: AngularFireFunctions): () => Promise<void> {
  return () => {
    return new Promise((resolve) => {
      if (!environment.production && environment.dev) {
        Promise.all([
          afAuth.useEmulator(`${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`),
          fns.useFunctionsEmulator(`${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}`)
        ]).then(() => resolve());
      }
      return resolve();
    });
  };
}

export function initializeAppCheckPrivate(afAuth: AngularFireAuth): () => Promise<void> {
  return () => {
    return afAuth.app.then((app) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(environment.recaptcha),
        isTokenAutoRefreshEnabled: true,
      });
    });
  };
}

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AngularFireAuth, AngularFireFunctions],
      useFactory: initializeEmulators
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AngularFireAuth],
      useFactory: initializeAppCheckPrivate
    },
    {provide: REGION, useValue: environment.firebase.locationId},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}},
    {provide: Window, useValue: window},
    {
      provide: USE_FIRESTORE_EMULATOR,
      useValue: !environment.production && environment.dev ? [environment.emulators.firestore.host, environment.emulators.firestore.port] : undefined
    },
    AppService,
    AuthService,
    ConnectionService,
    ExtraParametersGuard,
    CustomValidators
  ]
})
export class CoreModule {
}
