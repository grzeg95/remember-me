import {HttpClient, provideHttpClient} from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  Injector,
  provideExperimentalZonelessChangeDetection,
  Provider
} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {provideClientHydration} from '@angular/platform-browser';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideRouter} from '@angular/router';
import {environment} from 'environment';
import {getAnalytics} from 'firebase/analytics';
import {initializeApp} from 'firebase/app';
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {connectFunctionsEmulator, getFunctions,} from 'firebase/functions';
import {activate, fetchAndActivate, getRemoteConfig, isSupported} from 'firebase/remote-config';
import {forkJoin, mergeMap} from 'rxjs';
import {
  AnalyticsInjectionToken,
  AppCheckInjectionToken,
  AuthInjectionToken,
  FirebaseAppInjectionToken,
  FirestoreInjectionToken,
  FunctionsInjectionToken,
  RemoteConfigInjectionToken
} from './models/firebase';
import {AuthService} from './services/auth.service';
import {ConnectionService} from './services/connection.service';
import {FunctionsService} from './services/functions.service';
import {SvgService} from './services/svg.service';
import {ThemeSelectorService} from './services/theme-selector.service';
import {routes} from './views/app.routes';

if (!environment.production) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const provideFirebase = () => {

  const providers: Provider[] = [];

  // Firebase app

  const app = initializeApp(environment.firebase);

  providers.push({
    provide: FirebaseAppInjectionToken,
    useValue: app
  });

  // Firebase auth

  const auth = getAuth();

  if (!environment.production) {
    connectAuthEmulator(auth, `${environment.emulators.auth.protocol}://${environment.emulators.auth.host}:${environment.emulators.auth.port}`);
  }

  providers.push({
    provide: AuthInjectionToken,
    useValue: auth
  });

  // Firebase app check

  const provider = new ReCaptchaEnterpriseProvider(environment.recaptchaEnterprise);

  const appCheck = initializeAppCheck(undefined, {
    provider,
    isTokenAutoRefreshEnabled: true
  });

  providers.push({
    provide: AppCheckInjectionToken,
    useValue: appCheck
  });

  // Firebase firestore

  const firestore = getFirestore();

  if (!environment.production) {
    connectFirestoreEmulator(firestore, environment.emulators.firestore.host, environment.emulators.firestore.port);
  }

  providers.push({
    provide: FirestoreInjectionToken,
    useValue: firestore
  });

  // Firebase functions

  const functions = getFunctions(app, 'europe-central2');

  if (!environment.production) {
    connectFunctionsEmulator(functions, environment.emulators.functions.host, environment.emulators.functions.port);
  }

  providers.push({
    provide: FunctionsInjectionToken,
    useValue: functions
  });

  // Analysis

  const analysis = getAnalytics(app);

  providers.push({
    provide: AnalyticsInjectionToken,
    useValue: analysis
  });

  // Remote config

  const remoteConfig = getRemoteConfig(app);

  providers.push({
    provide: RemoteConfigInjectionToken,
    useValue: remoteConfig
  });

  // return providers

  return providers;
};

const firebaseInitializers: Provider[] = [
  {
    provide: APP_INITIALIZER,
    multi: true,
    deps: [Injector],
    useFactory: (injector: Injector) => {
      return async () => {

        return isSupported().then((isSupported: boolean) => {
          if (isSupported) {
            const remoteConfig = injector.get(RemoteConfigInjectionToken);

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

const angularMaterialProviders = [
  {
    provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2000}
  }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideFirebase(),
    AuthService,
    ConnectionService,
    FunctionsService,
    ...firebaseInitializers,
    ...angularMaterialProviders,
    ThemeSelectorService,
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [ThemeSelectorService],
      useFactory: (themeSelectorService: ThemeSelectorService) => {
        return () => themeSelectorService.loadTheme();
      }
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [SvgService, HttpClient],
      useFactory: (svgService: SvgService, http: HttpClient) => {

        const path = '/assets/svg';

        return () => http.get<{name: string, src: string}[]>(
          path + '/index.json'
        ).pipe(
          mergeMap((svgs) => {
            return forkJoin(
              svgs.map((svg) => svgService.registerSvg(svg.name, path + '/' + svg.src))
            );
          })
        )
      }
    },
  ]
};
