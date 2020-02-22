export interface ITask {
  timesOfDay: {
    [key: string]: boolean
  };
  daysOfTheWeek: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;

  }
  description: string;
}
