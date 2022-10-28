import {https} from '../../config';
import {handler} from '../../tools';

const getDeleteTaskHandler = () => require('./delete-task').handler;
export const deleteTask = https.onRequest((req, resp) =>
  handler(req, resp, getDeleteTaskHandler())
);

const getSaveTaskHandler = () => require('./save-task').handler;
export const saveTask = https.onRequest((req, resp) =>
  handler(req, resp, getSaveTaskHandler())
);

const getSetTimesOfDayOrderHandler = () => require('./set-times-of-day-order').handler;
export const setTimesOfDayOrder = https.onRequest((req, resp) =>
  handler(req, resp, getSetTimesOfDayOrderHandler())
);

const getSaveRoundHandler = () => require('./save-round').handler;
export const saveRound = https.onRequest((req, resp) =>
  handler(req, resp, getSaveRoundHandler())
);

const getDeleteRoundHandler = () => require('./delete-round').handler;
export const deleteRound = https.onRequest((req, resp) =>
  handler(req, resp, getDeleteRoundHandler(), 'text/plain')
);

const getSetRoundsOrderHandler = () => require('./set-rounds-order').handler;
export const setRoundsOrder = https.onRequest((req, resp) =>
  handler(req, resp, getSetRoundsOrderHandler())
);

export const handlersGetters = {
  getDeleteTaskHandler,
  getSaveTaskHandler,
  getSetTimesOfDayOrderHandler,
  getSaveRoundHandler,
  getDeleteRoundHandler,
  getSetRoundsOrderHandler
};
