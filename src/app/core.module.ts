import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {
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
} from 'services';

@NgModule({
  providers: [
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}
    },
    AngularFirebaseAppCheckService,
    AngularFirebaseAuthService,
    AngularFirebaseFirestoreService,
    AngularFirebaseFunctionsService,
    AngularFirebaseRemoteConfigService,
    AuthService,
    ConnectionService,
    CustomValidators,
  ]
})
export class CoreModule {
}
