import {computed, effect, Injectable, signal} from '@angular/core';
import {BehaviorSubject, Observable, combineLatest, map} from 'rxjs';
import {Day} from '../models/day';
import {HTTPSuccess} from '../models/http';
import {Round} from '../models/round';
import {Today} from '../models/today';
import {TodayItem} from '../models/today-item';
import {TodayTask} from '../models/today-task';
import {AuthService} from './auth.service';
import { Task } from '../models/task';
import {FunctionsService} from './functions.service';

@Injectable()
export class RoundsService {

  private readonly _user$ = this._authService.user$;

  //
  // Rounds
  //

  readonly loadingRound$ = new BehaviorSubject<boolean>(false);

  readonly round$ = new BehaviorSubject<Round | undefined>(undefined);

  readonly roundId$ = new BehaviorSubject<string | null | undefined>(undefined);

  readonly editRound$ = new BehaviorSubject<Round | undefined>(undefined);
  readonly editRoundId$ = new BehaviorSubject<string | null | undefined>(null);
  readonly loadingEditRound$ = new BehaviorSubject<boolean>(false);

  readonly roundsMap$ = new BehaviorSubject<Map<string, Round> | undefined>(undefined);
  readonly loadingRoundsMap$ = new BehaviorSubject<boolean>(false);

  readonly roundsOrderUpdated$ = new BehaviorSubject<string[] | undefined>(undefined);

  readonly roundsOrder$ = combineLatest([
    this._user$,
    this.roundsOrderUpdated$
  ]).pipe(
    map(([user, roundsOrderUpdated]) => {

      if (!user) {
        return undefined;
      }

      if (roundsOrderUpdated) {
        this.roundsOrderUpdated$.next(undefined);
        return roundsOrderUpdated;
      }

      return user.decryptedRounds;
    })
  );

  readonly roundsList$ = combineLatest([
    this.roundsOrder$,
    this.roundsMap$
  ]).pipe(
    map(([roundsOrder, roundsMap]) => {

      if (!roundsOrder || !roundsMap) {
        return undefined;
      }

      return roundsOrder.filter((roundId) => roundsMap.get(roundId)).map((roundId) => roundsMap.get(roundId)) as Round[];

    }));

  //
  // Today items
  //

  readonly todayTasksLoading$ = new BehaviorSubject<boolean>(false);
  readonly todayTasks$ = new BehaviorSubject<TodayTask[] | undefined>(undefined);

  private _todayItems$ = new BehaviorSubject<{[p: string]: TodayItem[]}>({});

  readonly todayItems$ = combineLatest([
    this.round$,
    this._todayItems$
  ]).pipe(
    map(([round, todayItems]) => {

      if (!round || !todayItems) {
        return undefined;
      }

      return round.timesOfDay.filter((timeOfDay) => todayItems[timeOfDay]).map((timeOfDay) => ({
        timeOfDay,
        tasks: todayItems[timeOfDay]
      }));
    })
  )

  readonly now$ = new BehaviorSubject<Date>(new Date());

  readonly today$ = this.now$.pipe(
    map((now) => {
      return {
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        short: (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[now.getDay()]
      };
    })
  )
  readonly dayToSetInEditor$ = new BehaviorSubject<Day | undefined>(undefined);

  readonly day$ = new BehaviorSubject<{full: string, short: Day} | undefined>(undefined);

  readonly todayMap$ = new BehaviorSubject<Map<string, Today> | undefined>(undefined);
  readonly todayMapLoading$ = new BehaviorSubject<boolean>(false);

  //
  // Tasks list
  //

  readonly tasks$ = new BehaviorSubject<Task[] | undefined>(undefined);
  readonly tasksLoading$ = new BehaviorSubject<boolean | undefined>(false);

  //
  // Task edit
  //
  dayToApply = signal<Day | null>(null);

  constructor(
    private readonly _functionsService: FunctionsService,
    private readonly _authService: AuthService
  ) {
  }

  saveRound(name: string, roundId: string = 'null') {
    return this._functionsService.httpsCallable<{
      roundId: string;
      name: string;
    }, {
      roundId: string;
      details: string;
      created: boolean;
    }>('rounds-saveround', {
      roundId,
      name
    });
  }

  deleteRound(id: string) {
    return this._functionsService.httpsCallable<string, any>('rounds-deleteround', id);
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('rounds-setroundsorder', data);
  }

  setTimesOfDayOrder(data: {timeOfDay: string, moveBy: number, roundId: string}) {
    return this._functionsService.httpsCallable<{
      timeOfDay: string,
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('rounds-settimesofdayorder', data);
  }

  saveTask(data: {
    task: {
      description: string;
      daysOfTheWeek: Day[];
      timesOfDay: string[];
    };
    taskId: string;
    roundId: string;
  }) {
    return this._functionsService.httpsCallable<{
      task: {
        description: string;
        daysOfTheWeek: Day[];
        timesOfDay: string[];
      },
      taskId: string;
      roundId: string;
    }, {
      created: boolean;
      taskId: string;
      details: string;
    }>('rounds-savetask', data);
  }

  deleteTask(data: {taskId: string; roundId: string}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      taskId: string,
      roundId: string
    }, HTTPSuccess>('rounds-deletetask', data);
  }

  unmarkTodayTasks(data: {roundId: string; todayId: string;}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      roundId: string,
      todayId: string
    }, HTTPSuccess>('rounds-unmarktodaytasks', {
      roundId: data.roundId,
      todayId: data.todayId
    })
  }
}
