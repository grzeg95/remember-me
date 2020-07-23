import {HttpsError} from 'firebase-functions/lib/providers/https';

/**
 * @function testRequirement
 * @param failed boolean
 * @return void
 **/
export const testRequirement = (failed: boolean): void => {
  if (failed) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }
};
