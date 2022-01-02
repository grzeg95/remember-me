import {Day} from '../../../../../../../../functions/src/helpers/models';

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

  dayToApply: Day;

  dayIsInNumber = (number: number, day: Day): boolean => {
    // tslint:disable-next-line:no-bitwise
    return (this.dayMap[day] & number) !== 0;
  };

  dayArrayToNumber = (days: Day[]): number => {
    return days.reduce((acc, cur) => acc + this.dayMap[cur], 0);
  };

  daysBooleanMapToNumber = (map: {[day in Day]: boolean}): number => {
    let number = 0;

    (Object.getOwnPropertyNames(map) as Day[]).forEach((day) => {
      if (map[day]) {
        number += this.dayMap[day];
      }
    });

    return number;
  };

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

}
