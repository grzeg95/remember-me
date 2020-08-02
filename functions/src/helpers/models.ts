/**
 * @type Day
 **/
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @interface Task
 **/
export interface Task {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {[key in Day]: boolean}
}

export interface TimeOfDay {
  counter: number;
  prev?: string;
  next?: string;
}
