import {Day} from '../../models';

export class TaskService {
  dayMap: {[key in Day]: number} = {
    mon: 64,
    tue: 32,
    wed: 16,
    thu: 8,
    fri: 4,
    sat: 2,
    sun: 1
  };

  dayToApply: Day | null = null;

  dayIsInNumber = (number: number, day: Day): boolean => {
    // tslint:disable-next-line:no-bitwise
    return (this.dayMap[day] & number) !== 0;
  };

  daysBooleanMapToDayArray = (map: {[day in Day]: boolean | null}): Day[] => {

    const dayArray: Day[] = [];

    for (const day of Object.getOwnPropertyNames(map)) {
      // @ts-ignore
      if (map[day]) {
        dayArray.push(day as Day);
      }
    }

    return dayArray;
  }

  numberToDaysBooleanMap = (number: number): {[day in Day]: boolean} => {
    return {
      mon: this.dayIsInNumber(number, 'mon'),
      tue: this.dayIsInNumber(number, 'tue'),
      wed: this.dayIsInNumber(number, 'wed'),
      thu: this.dayIsInNumber(number, 'thu'),
      fri: this.dayIsInNumber(number, 'fri'),
      sat: this.dayIsInNumber(number, 'sat'),
      sun: this.dayIsInNumber(number, 'sun')
    };
  };

  dayArrayToDaysBooleanMap = (array: Day[]): {[day in Day]: boolean} => {

    const daysBooleanMap: {[day in string]: boolean} = {};
    const set: Set<string> = new Set(array);

    for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      daysBooleanMap[day] = set.has(day);
    }

    return daysBooleanMap as {[day in Day]: boolean};
  }
}
