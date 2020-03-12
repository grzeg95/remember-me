export interface IDaysOfTheWeek {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

export interface ITask {
  description: string;
  daysOfTheWeek: IDaysOfTheWeek;
  timesOfDay: {
    [name: string]: boolean
  };
}

export interface ITodayItem {
  description: string;
  done: boolean;
  type: string;
  id: string;
}

export const daysOfTheWeekOrderUS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
