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
  timesOfDay: ITimesOfDay;
}

export interface ITimesOfDay {
  atDawn: boolean;
  morning: boolean;
  beforeNoon: boolean;
  atNoon: boolean;
  inTheAfternoon: boolean;
  beforeEvening: boolean;
  inTheEvening: boolean;
  inTheNight: boolean;
  duringTheDay: boolean;
}

export interface ITodayItem {
  description: string;
  done: boolean;
  type: string;
}

export interface ITodayTimesOfDayItems {
  [id: string]: ITodayItem;
}

export interface ITodayTimesOfDay {
  atDawn?: ITodayTimesOfDayItems;
  morning?: ITodayTimesOfDayItems;
  beforeNoon?: ITodayTimesOfDayItems;
  atNoon?: ITodayTimesOfDayItems;
  inTheAfternoon?: ITodayTimesOfDayItems;
  beforeEvening?: ITodayTimesOfDayItems;
  inTheEvening?: ITodayTimesOfDayItems;
  inTheNight?: ITodayTimesOfDayItems;
  duringTheDay?: ITodayTimesOfDayItems;
}

export const timesOfDayOrder = [
  'atDawn', 'morning', 'duringTheDay', 'beforeNoon', 'atNoon', 'inTheAfternoon', 'beforeEvening', 'inTheEvening', 'inTheNight'
];
export const timesOfDay = ['atDawn', 'morning', 'beforeNoon', 'atNoon', 'inTheAfternoon', 'beforeEvening', 'inTheEvening', 'inTheNight'];
export const daysOfTheWeekOrderUS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const timesOfDayDict = {
  atDawn: 'At dawn',
  morning: 'Morning',
  beforeNoon: 'Before noon',
  atNoon: 'At noon',
  inTheAfternoon: 'In the afternoon',
  beforeEvening: 'Before evening',
  inTheEvening: 'In the evening',
  inTheNight: 'In the night',
  duringTheDay: 'During the day'
};
