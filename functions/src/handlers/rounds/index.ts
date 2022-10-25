import {https} from '../../config'
import {handler} from '../../tools';

export const deleteTaskHandler = require('./delete-task').handler;
export const deleteTask = https.onRequest((req, resp) =>
  handler(req, resp, deleteTaskHandler)
);

export const saveTaskHandler = require('./save-task').handler;
export const saveTask = https.onRequest((req, resp) =>
  handler(req, resp, saveTaskHandler)
);

export const setTimesOfDayOrderHandler = require('./set-times-of-day-order').handler;
export const setTimesOfDayOrder = https.onRequest((req, resp) =>
  handler(req, resp, setTimesOfDayOrderHandler)
);

export const saveRoundHandler = require('./save-round').handler;
export const saveRound = https.onRequest((req, resp) =>
  handler(req, resp, saveRoundHandler)
);

export const deleteRoundHandler = require('./delete-round').handler;
export const deleteRound = https.onRequest((req, resp) =>
  handler(req, resp, deleteRoundHandler, 'text/plain')
);

export const setRoundsOrderHandler = require('./set-rounds-order').handler;
export const setRoundsOrder = https.onRequest((req, resp) =>
  handler(req, resp, setRoundsOrderHandler)
);

export const handlers = {
  deleteTaskHandler,
  saveTaskHandler,
  setTimesOfDayOrderHandler,
  deleteRoundHandler,
  setRoundsOrderHandler,
  saveRoundHandler
}
