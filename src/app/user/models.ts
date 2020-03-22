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

export interface ITimeOfDay {
  counter: number;
  name: string;
  position: number;
}

export interface ISuccess {
  details: string;
  taskId?: string;
  created?: boolean;
}

export interface IError {
  details: string;
}
