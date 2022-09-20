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

export interface FunctionResult {
  body: {[key: string]: string | boolean} | string;
  code: number;
}

export type FunctionResultPromise = Promise<FunctionResult>;

export type ContentType =
  'image/jpeg' |
  'image/jpg' |
  'image/png' |
  'application/json' |
  'text/plain';
