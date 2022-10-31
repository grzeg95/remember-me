import {HttpsError, FunctionsErrorCode} from 'firebase-functions/v2/https';

/**
 * @function testRequirement
 * @param {boolean} failed
 * @param {{code?: any, message?: string, details?: string}?} description
 * @return {void}
 **/
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
