export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DaysOfTheWeek = {
  [key in Day]: boolean;
};

export interface Task {
  description: string;
  daysOfTheWeek: DaysOfTheWeek;
  timesOfDay: string[];
}

export interface TodayItem {
  description: string;
  done: boolean;
  id: string;
}

export interface TasksListItem {
  description: string;
  timesOfDay: string[] | string;
  daysOfTheWeek: string;
  id: string;
}

export interface TimeOfDay {
  counter: number;
  position: number;
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
