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
import {AngularFirestore} from '@angular/fire/firestore';

export function initializeAuthEmulator(afAuth: AngularFireAuth, fns: AngularFireFunctions, afs: AngularFirestore): () => Promise<void> {
  return () => {
    return new Promise((resolve) => {
      if (!environment.production && environment.dev) {
        Promise.all([
          afAuth.useEmulator(`http://localhost:9099/`),
          fns.useFunctionsEmulator(`http://localhost:5000`),
          afs.firestore.useEmulator('localhost', 8080)
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
      deps: [AngularFireAuth, AngularFireFunctions, AngularFirestore],
      useFactory: initializeAuthEmulator
    },
    {provide: REGION, useValue: 'europe-west2'},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}},
    {provide: Window, useValue: window},
    {provide: USE_AUTH_EMULATOR, useValue: !environment.production && environment.dev ? ['localhost', 9099] : undefined},
    AppService,
    AuthService,
    AuthGuardUserService,
    AuthGuardGuestService,
    ConnectionService
  ]
})
export class CoreModule {
}
