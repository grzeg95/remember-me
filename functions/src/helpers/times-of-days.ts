import {Day} from './models';

const dayMap: {[day in Day]: number} = {
  mon: 64,
  tue: 32,
  wed: 16,
  thu: 8,
  fri: 4,
  sat: 2,
  sun: 1
};

export const dayIsInNumber = (number: number, day: Day): boolean => {
  return (dayMap[day] & number) !== 0;
};

export const numberToDayArray = (number: number): Day[] => {
  return (['mon', 'tue', 'wed','thu', 'fri', 'sat', 'sun'] as Day[]).filter(day => dayIsInNumber(number, day));
};

export const dayArrayToNumber = (days: Day[]): number => {
  return days.reduce((acc, cur) => acc + dayMap[cur], 0);
};
