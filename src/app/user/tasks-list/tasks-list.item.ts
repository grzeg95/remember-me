import {IDaysOfTheWeek} from '../models';

export class TasksListItem {

  constructor() {}

  id: string;
  order: number;
  description: string;
  daysOfTheWeek: string;
  timesOfDay: string;

  setDaysOfTheWeek(daysOfTheWeek: IDaysOfTheWeek): void  {

    const generated = TasksListItem.generateDaysOfTheWeek(daysOfTheWeek);

    if (generated !== this.daysOfTheWeek) {
      this.daysOfTheWeek = generated;
    }

  }

  setTimesOfDay(timesOfDay: {
    [name: string]: boolean
  }): void  {

    const generated = TasksListItem.generateTimeOfDay(timesOfDay);

    if (generated !== this.timesOfDay) {
      this.timesOfDay = generated;
    }

  }

  static generateDaysOfTheWeek(daysOfTheWeek: IDaysOfTheWeek): string {

    if (
      daysOfTheWeek.mon &&
      daysOfTheWeek.tue &&
      daysOfTheWeek.wed &&
      daysOfTheWeek.thu &&
      daysOfTheWeek.fri &&
      daysOfTheWeek.sat &&
      daysOfTheWeek.sun
    ) {
      return 'Every day';
    } else {

      const generated = [];
      for (const dayOfTheWeekKey in daysOfTheWeek) {
        if (daysOfTheWeek.hasOwnProperty(dayOfTheWeekKey) && daysOfTheWeek[dayOfTheWeekKey]) {
          generated.push(dayOfTheWeekKey);
        }
      }

      return generated.join(', ');

    }

  }

  static generateTimeOfDay(timesOfDay: {
    [name: string]: boolean
  }): string {

    const generated = [];

    for (const timeOfDayKey in timesOfDay) {
      if (timesOfDay.hasOwnProperty(timeOfDayKey) && timesOfDay[timeOfDayKey]) {
        generated.push(timeOfDayKey);
      }
    }

    return generated.join(', ');

  }

}
