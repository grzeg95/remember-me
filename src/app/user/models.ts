export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DaysOfTheWeek = {
  [key in Day]: boolean;
};

export interface ITaskFirestore {
  description: string;
  daysOfTheWeek: Day[];
  timesOfDay: string[];
}

export interface ITask {
  description: string;
  daysOfTheWeek: DaysOfTheWeek;
  timesOfDay: string[];
}

export class Task {
  description: string;
  daysOfTheWeek: DaysOfTheWeek;
  timesOfDay: string[];

  constructor(iTask: ITask) {
    this.description = iTask.description;
    this.daysOfTheWeek = iTask.daysOfTheWeek;
    this.timesOfDay = iTask.timesOfDay;
  }

  isEquals(otherITask: ITask): boolean {
    return this.description.trim() === otherITask.description.trim() &&
      this.timesOfDay.toSet().hasOnly(otherITask.timesOfDay.toSet()) &&
      this.daysOfTheWeek.mon === otherITask.daysOfTheWeek.mon &&
      this.daysOfTheWeek.tue === otherITask.daysOfTheWeek.tue &&
      this.daysOfTheWeek.wed === otherITask.daysOfTheWeek.wed &&
      this.daysOfTheWeek.thu === otherITask.daysOfTheWeek.thu &&
      this.daysOfTheWeek.fri === otherITask.daysOfTheWeek.fri &&
      this.daysOfTheWeek.sat === otherITask.daysOfTheWeek.sat &&
      this.daysOfTheWeek.sun === otherITask.daysOfTheWeek.sun
  }
}

export interface TodayItem {
  description: string;
  done: boolean;
  id: string;
  disabled: boolean;
}

export interface TasksListItem {
  description: string;
  timesOfDay: string[] | string;
  daysOfTheWeek: string;
  id: string;
}

export interface TimeOfDayFirestore {
  prev?: string;
  next?: string;
  counter: number;
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

export interface Round {
  id: string;
  name: string;
  timesOfDay: string[];
  taskSize: number;
}
