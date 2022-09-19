import {InjectionToken} from '@angular/core';
import {Analytics} from 'firebase/analytics';
import {FirebaseApp} from 'firebase/app';
import {Auth} from 'firebase/auth';
import {Firestore} from 'firebase/firestore';
import {RemoteConfig} from 'firebase/remote-config';

export const ANALYTICS = new InjectionToken<Analytics>('Analytics');
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');
export const AUTH = new InjectionToken<Auth>('Auth');
export const FIRESTORE = new InjectionToken<Firestore>('Firestore');
export const REMOTE_CONFIG = new InjectionToken<RemoteConfig>('RemoteConfig');
