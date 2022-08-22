import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AuthGuard} from './auth/auth-guard.service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';
import {CustomValidators} from './custom-validators';
import {getAuth} from 'firebase/auth';
import {FirebaseApp} from 'firebase/app';
import {getFunctions} from 'firebase/functions';
import {getFirestore} from 'firebase/firestore';
import {getRemoteConfig} from 'firebase/remote-config';
import {AUTH, FIREBASE_APP, FIRESTORE, FUNCTIONS, REMOTE_CONFIG} from './injectors';

@NgModule({
  providers: [
    {
      provide: FUNCTIONS,
      useFactory: (firebaseApp: FirebaseApp) => getFunctions(firebaseApp, environment.firebase.locationId),
      deps: [FIREBASE_APP]
    },
    {
      provide: AUTH,
      useFactory: (firebaseApp: FirebaseApp) => getAuth(firebaseApp),
      deps: [FIREBASE_APP]
    },
    {
      provide: FIRESTORE,
      useFactory: (firebaseApp: FirebaseApp) => getFirestore(firebaseApp),
      deps: [FIREBASE_APP]
    },
    {
      provide: REMOTE_CONFIG,
      useFactory: (firebaseApp: FirebaseApp) => getRemoteConfig(firebaseApp),
      deps: [FIREBASE_APP]
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
