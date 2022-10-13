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
import {AuthGuard, AuthService} from 'auth';
import {
  ConnectionService,
  CustomValidators,
  ExtraParametersRoutePipe,
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
    AuthGuard,
    AuthService,
    ConnectionService,
    CustomValidators,
    ExtraParametersRoutePipe,
    SecurityService
  ]
})
export class CoreModule {
}
