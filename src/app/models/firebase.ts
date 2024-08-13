import {InjectionToken} from '@angular/core';
import {FirebaseApp} from 'firebase/app';
import {Auth} from 'firebase/auth';
import {AppCheck} from 'firebase/app-check';
import {Firestore} from 'firebase/firestore';
import {Functions} from 'firebase/functions';
import {RemoteConfig} from 'firebase/remote-config';

export const FirebaseAppInjectionToken = new InjectionToken<FirebaseApp>('FirebaseApp');
export const AuthInjectionToken = new InjectionToken<Auth>('Auth');
export const AppCheckInjectionToken = new InjectionToken<AppCheck>('AppCheck');
export const FirestoreInjectionToken = new InjectionToken<Firestore>('Firestore');
export const FunctionsInjectionToken = new InjectionToken<Functions>('Functions');
export const RemoteConfigInjectionToken = new InjectionToken<RemoteConfig>('RemoteConfig');
