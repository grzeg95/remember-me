import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {
  ANALYTICS,
  AngularFirebaseAnalyticsService,
  AngularFirebaseAppCheckService,
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService,
  AngularFirebaseRemoteConfigService,
  AUTH,
  FIREBASE_APP,
  FIRESTORE,
  FUNCTIONS,
  REMOTE_CONFIG
} from 'angular-firebase';
import {AuthGuard, AuthService} from 'auth';
import {getAnalytics} from 'firebase/analytics';
import {FirebaseApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getFunctions} from 'firebase/functions';
import {getRemoteConfig} from 'firebase/remote-config';
import {environment} from '../environments/environment';
import {ConnectionService} from './connection.service';
import {CustomValidators} from './custom-validators';
import {ExtraParametersRoutePipe} from './extra-parameters-route-pipe.service';
import {SecurityService} from './security.service';

@NgModule({
  providers: [
    {
      provide: ANALYTICS,
      useFactory: (firebaseApp: FirebaseApp) => getAnalytics(firebaseApp),
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
      provide: FUNCTIONS,
      useFactory: (firebaseApp: FirebaseApp) => getFunctions(firebaseApp, environment.firebase.locationId),
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
    ExtraParametersRoutePipe,
    AuthGuard,
    AuthService,
    ConnectionService,
    CustomValidators,
    AngularFirebaseAuthService,
    AngularFirebaseFunctionsService,
    AngularFirebaseAppCheckService,
    AngularFirebaseAnalyticsService,
    AngularFirebaseRemoteConfigService,
    AngularFirebaseFirestoreService,
    SecurityService
  ]
})
export class CoreModule {
}
