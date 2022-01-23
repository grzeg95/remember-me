import {Day} from '../../../../../../../../functions/src/helpers/models';

export class TaskService {

  dayToApply: Day;

  daysBooleanMapToDayArray = (map: {[day in Day]: boolean}): Day[] => {

    const dayArray: Day[] = [];

    for (const day of Object.getOwnPropertyNames(map)) {
      if (map[day] !== false) {
        dayArray.push(day as Day);
      }
    }

    return dayArray;
  }

  dayArrayToDaysBooleanMap = (array: Day[]): {[day in Day]: boolean} => {

    const daysBooleanMap: {[day in string]: boolean} = {};
    const set: Set<string> = new Set(array);

    for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      daysBooleanMap[day] = set.has(day);
    }

    return daysBooleanMap as {[day in Day]: boolean};
  }
}
