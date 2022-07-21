import {HttpsError} from 'firebase-functions/lib/providers/https';

/**
 * @function testRequirement
 * @param failed boolean
 * @param details string optional
 * @return void
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
