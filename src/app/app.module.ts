import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {AngularFireModule} from '@angular/fire/compat';
import {AngularFireAnalyticsModule} from '@angular/fire/compat/analytics';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {environment} from '../environments/environment';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {CoreModule} from './core.module';
import {GuestAboutSecurityComponent} from './guest/guest-about-security/guest-about-security.component';
import {GuestComponent} from './guest/guest.component';
import {NavComponent} from './nav/nav.component';
import {SharedModule} from './shared.module';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    GuestComponent,
    GuestAboutSecurityComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SharedModule,
    CoreModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAnalyticsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
