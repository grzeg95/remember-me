import {Day} from '../models/firestore/Day';

export function dayArrayToDaysBooleanMap(array: Day[]): {[day in Day]: boolean} {

  const daysBooleanMap: {[day in string]: boolean} = {};
  const set: Set<string> = new Set(array);

  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    daysBooleanMap[day] = set.has(day);
  }

  return daysBooleanMap as {[day in Day]: boolean};
}
