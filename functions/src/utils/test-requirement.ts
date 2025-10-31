import {HttpsError, FunctionsErrorCode} from 'firebase-functions/v2/https';

export const testRequirement = (failed: boolean, description?: {
  code?: FunctionsErrorCode;
  message?: string;
  details?: string;
}): void => {
  if (failed) {
    throw new HttpsError(
      description?.code || 'invalid-argument',
      description?.message || 'Bad Request',
      description?.details || 'Some went wrong 🤫 Try again 🙂'
    );
  }
};
