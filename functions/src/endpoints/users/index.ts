import {onCall} from 'firebase-functions/https';
import {globalErrorHandler} from '../../utils/global-error-handler';

const getDeleteUserImageHandler = () => require('./delete-user-image').handler;
export const deleteuserimage = onCall((cr) => getDeleteUserImageHandler()(cr).catch(globalErrorHandler));

const getUploadProfileImageHandler = () => require('./upload-profile-image').handler;
export const uploadprofileimage = onCall((cr) => getUploadProfileImageHandler()(cr).catch(globalErrorHandler));


