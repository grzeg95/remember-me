import {firestore} from 'firebase-admin';
import DocumentReference = firestore.DocumentReference;

/**
 * @type Day
 **/
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @interface Task
 **/
export interface Task {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {[key in Day]: boolean}
}

export interface TimeOfDay {
  status: 'created' | 'updated' | 'removed';
  ref: DocumentReference,
  exists?: boolean,
  data: {
    counter: number,
    next: string | null,
    prev: string | null
  }
}
