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
  id: string;
}

export interface ITasksListItem {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: string;
  id: string;
}
