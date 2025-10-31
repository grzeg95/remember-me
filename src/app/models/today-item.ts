import {Day} from './firestore/Day';

export interface TodayItem {
  description: string;
  done: boolean;
  id: string;
  disabled: boolean;
  day: Day;
  timeOfDay: string;
}
