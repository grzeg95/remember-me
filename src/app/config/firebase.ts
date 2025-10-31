import {Provider} from '@angular/core';
import {initializeApp} from 'firebase/app';
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {connectStorageEmulator, getStorage} from 'firebase/storage';
import {environment} from '../../environments/environments';
import {
  AppCheckInjectionToken,
  AuthInjectionToken,
  FirebaseAppInjectionToken,
  FirestoreInjectionToken, FunctionsInjectionToken, StorageInjectionToken
} from '../tokens/firebase';
import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';

if (!environment.production) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export const provideFirebase = () => {

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
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
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
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  }

  providers.push({
    provide: FirestoreInjectionToken,
    useValue: firestore
  });

  // Firebase functions

  const functions = getFunctions(app, 'europe-central2');

  if (!environment.production) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  providers.push({
    provide: FunctionsInjectionToken,
    useValue: functions
  });

  // Firebase storage

  const storage = getStorage(app);

  if (!environment.production) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }

  providers.push({
    provide: StorageInjectionToken,
    useValue: storage
  });

  return providers;
};
