import {NgModule} from '@angular/core';
import {REGION} from '@angular/fire/functions';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {AuthGuardUserService} from './auth/auth.guard.user.service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';
import {USE_EMULATOR as AUTH_EMULATOR} from '@angular/fire/auth';
import {USE_EMULATOR as FIRESTORE_EMULATOR} from '@angular/fire/firestore';
import {USE_EMULATOR as FUNCTIONS_EMULATOR} from '@angular/fire/functions';

@NgModule({
  providers: [
    AppService,
    AuthService,
    AuthGuardUserService,
    AuthGuardGuestService,
    ConnectionService,
    {provide: REGION, useValue: 'europe-west2'},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}},
    {provide: Window, useValue: window},
    {provide: FIRESTORE_EMULATOR, useValue: !environment.production && environment.dev ? environment.emulators.firestore : undefined},
    {provide: FUNCTIONS_EMULATOR, useValue: !environment.production && environment.dev ?  environment.emulators.functions : undefined},
    {provide: AUTH_EMULATOR, useValue: !environment.production && environment.dev ? environment.emulators.auth : undefined},
  ]
})
export class CoreModule {
}
