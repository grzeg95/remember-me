import {HttpsError} from 'firebase-functions/lib/providers/https';

export const globalTransactionCatch = (error: HttpsError) => {
  throw error;
};
