import {APP_INITIALIZER, NgModule} from '@angular/core';
import {AngularFireFunctions, REGION} from '@angular/fire/functions';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {AuthGuardUserService} from './auth/auth.guard.user.service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';
import {AngularFireAuth, USE_EMULATOR as USE_AUTH_EMULATOR} from '@angular/fire/auth';
import {USE_EMULATOR as USE_FIRESTORE_EMULATOR} from '@angular/fire/firestore';
import {GoogleAnalyticsService} from './google-analytics.service';

export function initializeAuthEmulator(afAuth: AngularFireAuth, fns: AngularFireFunctions): () => Promise<void> {
  return () => {
    return new Promise((resolve) => {
      if (!environment.production && environment.dev) {
        Promise.all([
          afAuth.useEmulator(`${environment.emulators.auth.host}:${environment.emulators.auth.port}`),
          fns.useFunctionsEmulator(`${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}`)
        ]).then(() => resolve());
      }
      return resolve();
    });
  };
}

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AngularFireAuth, AngularFireFunctions],
      useFactory: initializeAuthEmulator
    },
    {provide: REGION, useValue: 'europe-west2'},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}},
    {provide: Window, useValue: window},
    {provide: USE_AUTH_EMULATOR, useValue: !environment.production && environment.dev ? [environment.emulators.auth.host, environment.emulators.auth.port] : undefined},
    {provide: USE_FIRESTORE_EMULATOR, useValue: !environment.production && environment.dev ? [environment.emulators.firestore.host, environment.emulators.firestore.port] : undefined},
    AppService,
    AuthService,
    AuthGuardUserService,
    AuthGuardGuestService,
    ConnectionService,
    GoogleAnalyticsService
  ]
})
export class CoreModule {
}
