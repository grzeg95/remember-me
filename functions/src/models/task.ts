import {listEqual} from "../tools";

export class Task {

  static timesOfDay = ['atDawn', 'morning', 'beforeNoon', 'atNoon', 'inTheAfternoon', 'beforeEvening', 'inTheEvening', 'inTheNight', 'duringTheDay'];
  static daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  static isValid(task: any) {

    const taskKeys = Object.keys((task as Object));
    const taskDaysOfTheWeekKeys = Object.keys((task.daysOfTheWeek as Object));
    const taskTimesOfDayKeys = Object.keys((task.timesOfDay as Object));

    return (

      taskKeys.length === 3 &&
      listEqual(taskKeys, ['description','daysOfTheWeek','timesOfDay']) &&

      typeof task.description === 'string' && (task.description as string).length >= 4 && (task.description as string).length <= 100 &&

      taskDaysOfTheWeekKeys.length === 7 &&
      listEqual(taskDaysOfTheWeekKeys, Task.daysOfTheWeek) &&
      typeof task.daysOfTheWeek.mon === 'boolean' &&
      typeof task.daysOfTheWeek.tue === 'boolean' &&
      typeof task.daysOfTheWeek.wed === 'boolean' &&
      typeof task.daysOfTheWeek.thu === 'boolean' &&
      typeof task.daysOfTheWeek.fri === 'boolean' &&
      typeof task.daysOfTheWeek.sat === 'boolean' &&
      typeof task.daysOfTheWeek.sun === 'boolean' &&
      taskDaysOfTheWeekKeys.some(e => e) && // some true

      taskTimesOfDayKeys.length === 9 &&
      listEqual(taskTimesOfDayKeys, Task.timesOfDay) &&
      typeof task.timesOfDay.atDawn === 'boolean' &&
      typeof task.timesOfDay.morning === 'boolean' &&
      typeof task.timesOfDay.beforeNoon === 'boolean' &&
      typeof task.timesOfDay.atNoon === 'boolean' &&
      typeof task.timesOfDay.inTheAfternoon === 'boolean' &&
      typeof task.timesOfDay.beforeEvening === 'boolean' &&
      typeof task.timesOfDay.inTheEvening === 'boolean' &&
      typeof task.timesOfDay.inTheNight === 'boolean' &&
      typeof task.timesOfDay.duringTheDay === 'boolean' &&
      taskTimesOfDayKeys.some(e => e) // some true
    );

  }

}
