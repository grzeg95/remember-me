import {HttpsError} from 'firebase-functions/v2/https';

/**
 * @function testRequirement
 * @param {boolean} failed
 * @param {string?} details
 * @return {void}
 **/
export const testRequirement = (failed: boolean, details?: string): void => {
  if (failed) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      details || 'Some went wrong 🤫 Try again 🙂'
    );
  }
};
