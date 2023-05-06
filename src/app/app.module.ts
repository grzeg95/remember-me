import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {MatTabsModule} from '@angular/material/tabs';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AuthFormComponent, LoginComponent, RegisterComponent, SendPasswordResetEmailComponent} from 'auth';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {CoreModule} from './core.module';
import {GuestComponent} from './guest/guest.component';
import {UserDataPolicyComponent} from './guest/user-data-policy/user-data-policy.component';
import {NavComponent} from './nav/nav.component';
import {SharedModule} from './shared.module';

@NgModule({
  declarations: [
    AppComponent,
    GuestComponent,
    NavComponent,
    UserDataPolicyComponent,
    LoginComponent,
    RegisterComponent,
    AuthFormComponent,
    SendPasswordResetEmailComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CoreModule,
    HttpClientModule,
    SharedModule,
    MatTabsModule
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {
}
