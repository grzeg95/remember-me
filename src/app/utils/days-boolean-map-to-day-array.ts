import {Day} from '../models/firestore/Day';

export function daysBooleanMapToDayArray(daysBooleanMap: {[day in Day]: boolean | null}): Day[] {

  const dayArray: Day[] = [];

  for (const day of Object.getOwnPropertyNames(daysBooleanMap)) {
    if (daysBooleanMap[day as Day]) {
      dayArray.push(day as Day);
    }
  }

  return dayArray;
}
