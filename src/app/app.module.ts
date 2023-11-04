import {HttpClientModule} from '@angular/common/http';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import {getAnalytics, provideAnalytics} from '@angular/fire/analytics';
import {FirebaseApp, getApp, initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {initializeAppCheck, provideAppCheck, ReCaptchaEnterpriseProvider} from '@angular/fire/app-check';
import {connectAuthEmulator, getAuth, provideAuth} from '@angular/fire/auth';
import {connectFirestoreEmulator, getFirestore, provideFirestore} from '@angular/fire/firestore';
import {activate, fetchAndActivate, getRemoteConfig, provideRemoteConfig} from '@angular/fire/remote-config';
import {MatTabsModule} from '@angular/material/tabs';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AuthFormComponent, LoginComponent, RegisterComponent, SendPasswordResetEmailComponent} from 'auth';
import {environment} from 'environment';
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
    MatTabsModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {

      const firestore = getFirestore();

      if (!environment.production) {
        connectFirestoreEmulator(firestore, environment.emulators.firestore.host, environment.emulators.firestore.port);
      }

      return firestore;
    }),
    provideAuth(() => {

      const auth = getAuth();

      if (!environment.production) {
        connectAuthEmulator(auth, `${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`);
      }

      return auth;
    }),
    provideAppCheck(() => initializeAppCheck(getApp(), {
      provider: new ReCaptchaEnterpriseProvider(environment.recaptcha),
      isTokenAutoRefreshEnabled: true
    })),
    provideRemoteConfig(() => getRemoteConfig()),
    provideAnalytics(() => getAnalytics()),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [FirebaseApp],
      useFactory: (app: FirebaseApp) => {
        return () => {
          const remoteConfig = getRemoteConfig(app);

          return fetch(!environment.production ? '/assets/remote-config-default.json' : '/assets/remote-config-default-prod.json').then((res) => {
            return res.json().then((remoteConfigDefault) => {
              remoteConfig.defaultConfig = remoteConfigDefault;
              return activate(remoteConfig);
            });
          }).catch(() => {
          }).then(() => fetchAndActivate(remoteConfig))
        };
      }
    }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {
}
