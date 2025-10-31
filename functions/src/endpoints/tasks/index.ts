import {onCall} from 'firebase-functions/https';
import {globalErrorHandler} from '../../utils/global-error-handler';

const getCreateTaskHandler = () => require('./create-task').handler;
export const createtask = onCall((cr) => getCreateTaskHandler()(cr).catch(globalErrorHandler));

const getDeleteTaskHandler = () => require('./delete-task').handler;
export const deletetask = onCall((cr) => getDeleteTaskHandler()(cr).catch(globalErrorHandler));

const getUpdateTaskHandler = () => require('./update-task').handler;
export const updatetask = onCall((cr) => getUpdateTaskHandler()(cr).catch(globalErrorHandler));

const getMoveTimesOfDayHandler = () => require('./move-times-of-day').handler;
export const movetimesofday = onCall((cr) => getMoveTimesOfDayHandler()(cr).catch(globalErrorHandler));
