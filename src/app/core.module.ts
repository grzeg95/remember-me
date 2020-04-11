import {NgModule} from '@angular/core';
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
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}}
  ]
})
export class CoreModule {

  constructor(private fns: AngularFireFunctions) {
    if (!environment.production) {
      this.fns.functions.useFunctionsEmulator('http://localhost:' + environment.functions.port);
    }
  }

}
