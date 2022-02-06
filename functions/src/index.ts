// DEV
// process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
import {initializeApp} from 'firebase-admin';

initializeApp();

export * from './handlers';
export * from './security';
