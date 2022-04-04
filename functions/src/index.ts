// DEV
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:/Users/grzeg/Desktop/remember-me-dev-03ec99316d90.json';
import {initializeApp} from 'firebase-admin';

initializeApp();

export * from './handlers';
export * from './security';
