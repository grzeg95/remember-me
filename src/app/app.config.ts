import {provideHttpClient} from '@angular/common/http';
import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom, Injector, Provider} from '@angular/core';
import {getAnalytics, provideAnalytics, setConsent, initializeAnalytics} from '@angular/fire/analytics';
import {getApp, initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {initializeAppCheck, provideAppCheck, ReCaptchaEnterpriseProvider} from '@angular/fire/app-check';
import {connectAuthEmulator, getAuth, provideAuth} from '@angular/fire/auth';
import {connectFirestoreEmulator, getFirestore, provideFirestore} from '@angular/fire/firestore';
import {connectFunctionsEmulator, getFunctions, provideFunctions} from '@angular/fire/functions';
import {
  activate,
  fetchAndActivate,
  getRemoteConfig,
  isSupported,
  provideRemoteConfig,
  RemoteConfig
} from '@angular/fire/remote-config';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {provideClientHydration} from '@angular/platform-browser';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideRouter} from '@angular/router';
import {
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService,
  AngularFirebaseRemoteConfigService,
} from 'angular-firebase';
import {AuthService} from 'auth';
import {environment} from 'environment';
import {fromEvent, merge} from 'rxjs';
import {ConnectionService} from 'services';
import {routes} from './app.routes';
import {CookiebotService} from './services/cookiebot.service';

const firebaseModules = [
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
  provideFunctions(() => {
    const app = getApp();
    const functions = getFunctions(app, environment.functionsRegionOrCustomDomain);

    if (!environment.production) {
      connectFunctionsEmulator(functions, environment.emulators.functions.host, environment.emulators.functions.port);
    }

    return functions;
  })
];

const firebaseInitializers: Provider[] = [
  {
    provide: APP_INITIALIZER,
    multi: true,
    useFactory: () => {
      return () => {
        if (!environment.production) {
          // @ts-ignore
          window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
      }
    }
  },
  {
    provide: APP_INITIALIZER,
    multi: true,
    deps: [Injector],
    useFactory: (injector: Injector) => {
      return async () => {

        return isSupported().then((isSupported: boolean) => {
          if (isSupported) {
            const remoteConfig = injector.get(RemoteConfig);

            remoteConfig.settings.minimumFetchIntervalMillis = 3600000;

            return fetch(!environment.production ? '/assets/remote-config-default.json' : '/assets/remote-config-default-prod.json').then((res) => {
              return res.json().then((remoteConfigDefault) => {
                remoteConfig.defaultConfig = remoteConfigDefault;
                return activate(remoteConfig);
              });
            }).catch(() => {
            }).then(() => fetchAndActivate(remoteConfig));
          }
          return;
        });
      };
    }
  }
];

const cookiebotInitializer: Provider = {
  provide: APP_INITIALIZER,
  multi: true,
  deps: [CookiebotService],
  useFactory: (cookiebotService: CookiebotService) => {
    return () => {
      merge(
        fromEvent(window, 'CookiebotOnLoad'),
        fromEvent(window, 'CookiebotOnDecline'),
        fromEvent(window, 'CookiebotOnAccept')
      ).subscribe(() => {
        setConsent(cookiebotService.getConsentSettings());
        initializeAnalytics(getApp());
      })
    }
  }
};

const angularMaterialProviders = [
  {
    provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}
  }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    provideAnimationsAsync(),
    importProvidersFrom(...firebaseModules),
    AuthService,
    AngularFirebaseAuthService,
    AngularFirebaseFirestoreService,
    AngularFirebaseRemoteConfigService,
    AngularFirebaseFunctionsService,
    ConnectionService,
    CookiebotService,
    cookiebotInitializer,
    ...firebaseInitializers,
    ...angularMaterialProviders,
  ]
};
