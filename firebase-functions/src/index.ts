// DEV
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:/Projects/remember-me/firebase-functions/remember-me-dev-6b6dfda4509e.json';
import {initializeApp} from 'firebase-admin';

initializeApp();

export * from './handlers';
export * from './security';
