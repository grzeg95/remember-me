import {onCall} from 'firebase-functions/v2/https';
import {optsV2} from '../../config';

/* eslint-disable @typescript-eslint/no-var-requires*/

const getDeleteTaskHandler = () => require('./delete-task').handler;
export const deletetask = onCall(optsV2, getDeleteTaskHandler());

const getSaveTaskHandler = () => require('./save-task').handler;
export const savetask = onCall(optsV2, getSaveTaskHandler());

const getSetTimesOfDayOrderHandler = () => require('./set-times-of-day-order').handler;
export const settimesofdayorder = onCall(optsV2, getSetTimesOfDayOrderHandler());

const getSaveRoundHandler = () => require('./save-round').handler;
export const saveround = onCall(optsV2, getSaveRoundHandler());

const getDeleteRoundHandler = () => require('./delete-round').handler;
export const deleteround = onCall(optsV2, getDeleteRoundHandler());

const getSetRoundsOrderHandler = () => require('./set-rounds-order').handler;
export const setroundsorder = onCall(optsV2, getSetRoundsOrderHandler());

const getUnmarkTodayTasks = () => require('./unmark-today-tasks').handler;
export const unmarktodaytasks = onCall(optsV2, getUnmarkTodayTasks());

export const handlersGetters = {
  getDeleteTaskHandler,
  getSaveTaskHandler,
  getSetTimesOfDayOrderHandler,
  getSaveRoundHandler,
  getDeleteRoundHandler,
  getSetRoundsOrderHandler,
  getUnmarkTodayTasks
};
