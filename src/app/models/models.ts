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
  description: string | null;
  daysOfTheWeek: {[key in Day]: boolean | null};
  timesOfDay: string[];
}
