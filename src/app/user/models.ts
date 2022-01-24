export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TodayItem {
  description: string;
  done: boolean;
  id: string;
  disabled: boolean;
  dayOfTheWeekId: string;
  timeOfDayEncrypted: string;
}

export interface TasksListItem {
  description: string;
  timesOfDay: string[] | string;
  daysOfTheWeek: string;
  id: string;
}

export interface HTTPSuccess {
  details: string;
  taskId?: string;
  created?: boolean;
}

export interface HTTPError {
  code: string;
  message: string;
  details: string;
}

export interface TaskForm {
  description: string;
  daysOfTheWeek: {[key in Day]: boolean};
  timesOfDay: string[];
}

export interface Task {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: Day[];
}

export interface EncryptedTask {
  description: string;
  timesOfDay: string;
  daysOfTheWeek: string;
}

export interface Round {
  timesOfDayEncrypted?: string[];
  id?: string;
  taskSize: number;
  timesOfDay: string[];
  timesOfDayCardinality: number[];
  name: string;
}

export interface EncryptedRound {
  taskSize: string;
  timesOfDay: string[];
  timesOfDayCardinality: string;
  name: string;
}

export interface TimesOfDay {
  taskSize?: number;
  timesOfDay?: string[];
  timesOfDayCardinality?: number[];
}

export interface User {
  rounds?: string[];
}

export interface TodayTask {
  description: string;
  timesOfDay: {[key in string]: boolean};
  timesOfDayEncryptedMap: {[key in string]: string}
}

export interface EncryptedTodayTask {
  description: string;
  timesOfDay: {[key in string]: boolean};
}
