import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, defer, map} from 'rxjs';
import {Day} from '../models/firestore/Day';

;
import {Round} from '../models/firestore/Round';
import {httpsCallable} from 'firebase/functions';
import {Today} from '../models/firestore/Today';
import {TodayTask} from '../models/firestore/TodayTask';
import {FunctionsInjectionToken} from '../tokens/firebase';
import { Task } from '../models/firestore/Task';

@Injectable()
export class Rounds {

  private readonly _functions = inject(FunctionsInjectionToken);

  selectedRound$ = new BehaviorSubject<Round | null | undefined>(undefined);
  selectedRoundId$ = new BehaviorSubject<string | null | undefined>(undefined);
  loadingSelectedRound$ = new BehaviorSubject<boolean>(false);
  editingRound$ = new BehaviorSubject<Round | null | undefined>(null);
  editingRoundId$ = new BehaviorSubject<string | undefined | null>(undefined);
  roundsOrderUpdated$ = new BehaviorSubject<string[] | null>(null);
  roundsMap$ = new BehaviorSubject<Map<string, Round> | undefined>(undefined);
  loadingEditingRound$ = new BehaviorSubject<boolean>(false);
  loadingRoundsMap$ = new BehaviorSubject<boolean>(false);
  todayTasks$ = new BehaviorSubject<TodayTask[] | undefined>(undefined);
  todayTasksLoading$ = new BehaviorSubject<boolean>(false);
  dayToSetInEditor$ = new BehaviorSubject<Day | undefined>(undefined);
  tasks$ = new BehaviorSubject<Task[] | undefined>(undefined);
  tasksLoading$ = new BehaviorSubject<boolean>(false);

  readonly now$ = new BehaviorSubject<Date>(new Date());
  readonly today$ = this.now$.pipe(
    map((now) => {
      return {
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        short: (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[now.getDay()]
      };
    })
  )

  moveRound(data: { move: number, round: {id: string}}) {
    return defer(() => httpsCallable<{ move: number, round: {id: string}}, {details: string}>(this._functions, 'rounds-moveround')(data));
  }

  createRound(data: { round: {name: string}}) {
    return defer(() => httpsCallable<{ round: {name: string}}, {details: string, round: {id: string}}>(this._functions, 'rounds-createround')(data));
  }

  updateRound(data: { round: {id: string; name: string}}) {
    return defer(() => httpsCallable<{ round: {id: string; name: string}}, {details: string}>(this._functions, 'rounds-updateround')(data));
  }

  deleteRound(data: { round: {id: string}}) {
    return defer(() => httpsCallable<{ round: {id: string}}, {details: string}>(this._functions, 'rounds-deleteround')(data));
  }

  createTask(data: {
    round: {id: string},
    task: {
      description: string;
      days: Day[];
      timesOfDay: string[]
    }
  }) {
    return defer(() => httpsCallable<{
      round: {id: string},
      task: {
        description: string;
        days: Day[];
        timesOfDay: string[]
      }
    }, {details: string; taskId: string;}>(this._functions, 'tasks-createtask')(data));
  }

  updateTask(data: {
    round: {id: string},
    task: {
      id: string;
      description: string;
      days: Day[];
      timesOfDay: string[]
    }
  }) {
    return defer(() => httpsCallable<{
      round: {id: string},
      task: {
        id: string;
        description: string;
        days: Day[];
        timesOfDay: string[]
      }
    }, {details: string}>(this._functions, 'tasks-updatetask')(data));
  }

  deleteTask(data: {round: {id: string}, task: {id: string}}) {
    return defer(() => httpsCallable<{round: {id: string}, task: {id: string}}, {details: string}>(this._functions, 'tasks-deletetask')(data));
  }

  moveTimesOfDay(data: {move: number; timeOfDay: string; round: {id: string}}) {
    return defer(() => httpsCallable<{move: number; timeOfDay: string; round: {id: string}}, {details: string}>(this._functions, 'tasks-movetimesofday')(data));
  }
}
