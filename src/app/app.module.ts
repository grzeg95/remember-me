import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {AngularFireModule} from '@angular/fire/compat';
import {AngularFireAnalyticsModule} from '@angular/fire/compat/analytics';
import {AngularFirestoreModule} from '@angular/fire/compat/firestore';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {environment} from '../environments/environment';
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
    NavComponent,
    GuestComponent,
    UserDataPolicyComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SharedModule,
    CoreModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule.enablePersistence(),
    AngularFireAnalyticsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
