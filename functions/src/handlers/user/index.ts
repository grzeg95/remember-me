import {onCall} from 'firebase-functions/v2/https';
import {optsV2} from '../../config';

/* eslint-disable @typescript-eslint/no-var-requires*/

export const uploadprofileimage = onCall(optsV2, require('./upload-profile-image').handler);
