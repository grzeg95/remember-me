import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {MatProgressBarModule} from '@angular/material/progress-bar';
import {UserIdleModule} from 'angular-user-idle';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {CoreModule} from './core.module';
import {GuestComponent} from './guest/guest.component';
import {NavComponent} from './nav/nav.component';
import {SharedModule} from './shared.module';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    GuestComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SharedModule,
    CoreModule,
    HttpClientModule,
    MatProgressBarModule,
    UserIdleModule.forRoot({
      idle: 15
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
