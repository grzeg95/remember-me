import {HttpsError} from 'firebase-functions/lib/providers/https';

/**
 * @function testRequirement
 * @param info string
 * @param failed boolean
 * @param ref? any
 * @return void
 **/
export const testRequirement = (info: string, failed: boolean, ref?: any): void => {

  if (failed) {
    console.error({
      [info]: {
        ref
      }
    });

    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }
};
