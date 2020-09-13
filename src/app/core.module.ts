import {NgModule} from '@angular/core';
import {SETTINGS} from '@angular/fire/firestore';
import {AngularFireFunctions, FUNCTIONS_REGION} from '@angular/fire/functions';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {AuthGuardUserService} from './auth/auth.guard.user.service';
import {AuthService} from './auth/auth.service';

@NgModule({
  providers: [
    AppService,
    AuthService,
    AuthGuardUserService,
    AuthGuardGuestService,
    AngularFireFunctions,
    {provide: FUNCTIONS_REGION, useValue: 'europe-west2'},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}},
    {provide: Window, useValue: window},
    {provide: SETTINGS, useValue: !environment.production && environment.functions.dev ? environment.emulators.firestore : undefined}
  ]
})
export class CoreModule {

  constructor(private fns: AngularFireFunctions) {
    if (!environment.production && environment.functions.dev) {
      this.fns.functions.useFunctionsEmulator(environment.emulators.functions.host);
    }
  }

}
