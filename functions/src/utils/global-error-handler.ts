import {error} from 'firebase-functions/logger';
import {HttpsError} from 'firebase-functions/v2/https';
import {testRequirement} from './test-requirement';

export const globalErrorHandler = (e: Error) => {
  error(e);
  testRequirement(!(e instanceof HttpsError), {code: 'internal'});
  throw e;
};
