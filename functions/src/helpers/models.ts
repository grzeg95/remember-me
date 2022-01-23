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
  daysOfTheWeek: string[];
}

export interface TimesOfDay {
  taskSize?: number;
  timesOfDay?: string[];
  timesOfDayCardinality?: number[];
}

export interface User {
  rounds?: string[];
}
