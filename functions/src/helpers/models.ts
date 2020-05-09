/**
 * @type Day
 **/
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @interface ITask
 **/
export interface ITask {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {[key in Day]: boolean}
}
