import {NgModule} from '@angular/core';
import {AngularFireFunctions, FUNCTIONS_REGION} from '@angular/fire/functions';
import {environment} from '../environments/environment';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {AuthGuardUserService} from './auth/auth.guard.user.service';
import {AuthService} from './auth/auth.service';

@NgModule({
  providers: [
    AuthService,
    AuthGuardUserService,
    AuthGuardGuestService,
    AngularFireFunctions,
    { provide: FUNCTIONS_REGION, useValue: 'europe-west2' }
  ]
})
export class CoreModule {

  constructor(private fns: AngularFireFunctions) {
    if (!environment.production) {
      console.log('Using local functions from ' + 'http://localhost:' + environment.functions.port);
      this.fns.functions.useFunctionsEmulator('http://localhost:' + environment.functions.port);
    }
  }

}
