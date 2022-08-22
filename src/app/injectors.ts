import {InjectionToken} from '@angular/core';
import {FirebaseApp} from 'firebase/app';
import {Auth} from 'firebase/auth';
import {Firestore} from 'firebase/firestore';
import {Functions} from 'firebase/functions';
import {RemoteConfig} from 'firebase/remote-config';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');
export const FIRESTORE = new InjectionToken<Firestore>('Firestore');
export const AUTH = new InjectionToken<Auth>('Auth');
export const FUNCTIONS = new InjectionToken<Functions>('Functions');
export const REMOTE_CONFIG = new InjectionToken<RemoteConfig>('RemoteConfig');
