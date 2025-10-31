import {onCall} from 'firebase-functions/https';
import {globalErrorHandler} from '../../utils/global-error-handler';

const getCreateRoundHandler = () => require('./create-round').handler;
export const createround = onCall((cr) => getCreateRoundHandler()(cr).catch(globalErrorHandler));

const getDeleteRoundHandler = () => require('./delete-round').handler;
export const deleteround = onCall((cr) => getDeleteRoundHandler()(cr).catch(globalErrorHandler));

const getUpdateRoundHandler = () => require('./update-round').handler;
export const updateround = onCall((cr) => getUpdateRoundHandler()(cr).catch(globalErrorHandler));

const getMoveRoundHandler = () => require('./move-round').handler;
export const moveround = onCall((cr) => getMoveRoundHandler()(cr).catch(globalErrorHandler));

