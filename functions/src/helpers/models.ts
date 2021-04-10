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
  daysOfTheWeek: number
}

export interface User {
  taskSize?: number;
  timesOfDay?: string[],
  timesOfDayCardinality?: number[],
}
