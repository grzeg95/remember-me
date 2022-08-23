/**
 * @type Day
 **/
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Task {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: Day[];
}

export interface Round {
  timesOfDay: string[];
  timesOfDayCardinality: number[];
  todaysIds: string[];
  tasksIds: string[];
  name: string;
}

export interface TodayTask {
  description: string;
  timesOfDay: {[key in string]: boolean};
}

export interface EncryptedTodayTask {
  description: string;
  timesOfDay: {[key in string]: boolean};
}

export interface Today {
  name: string;
  tasksIds: string[];
}
