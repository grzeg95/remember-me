import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {
  ANALYTICS,
  AngularFirebaseAnalyticsService,
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseRemoteConfigService,
  AUTH,
  FIREBASE_APP,
  FIRESTORE,
  REMOTE_CONFIG
} from 'angular-firebase';
import {AuthGuard, AuthService} from 'auth';
import {getAnalytics} from 'firebase/analytics';
import {FirebaseApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getRemoteConfig} from 'firebase/remote-config';
import {
  ConnectionService,
  CustomValidators,
  ExtraParametersRoutePipe,
  FunctionsService,
  SecurityService
} from 'services';

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
    FunctionsService,
    AngularFirebaseAnalyticsService,
    AngularFirebaseRemoteConfigService,
    AngularFirebaseFirestoreService,
    SecurityService
  ]
})
export class CoreModule {
}
