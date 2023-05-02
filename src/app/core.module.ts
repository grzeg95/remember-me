import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {
  AngularFirebaseAnalyticsService,
  AngularFirebaseAppCheckService,
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService,
  AngularFirebaseRemoteConfigService
} from 'angular-firebase';
import {AuthService} from 'auth';
import {
  ConnectionService,
  CustomValidators,
  SecurityService
} from 'services';

@NgModule({
  providers: [
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}
    },
    AngularFirebaseAnalyticsService,
    AngularFirebaseAppCheckService,
    AngularFirebaseAuthService,
    AngularFirebaseFirestoreService,
    AngularFirebaseFunctionsService,
    AngularFirebaseRemoteConfigService,
    AuthService,
    ConnectionService,
    CustomValidators,
    SecurityService
  ]
})
export class CoreModule {
}
