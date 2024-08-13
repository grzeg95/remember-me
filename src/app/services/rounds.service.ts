import {computed, effect, Injectable, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {Day} from '../models/day';
import {HTTPSuccess} from '../models/http';
import {Round} from '../models/round';
import {Today} from '../models/today';
import {TodayItem} from '../models/today-item';
import {TodayTask} from '../models/today-task';
import {Sig} from '../utils/sig';
import {AuthService} from './auth.service';
import {FunctionsService} from './functions.service';
import { Task } from '../models/task';

@Injectable()
export class RoundsService {

  private readonly _user = this._authService.userSig.get();

  //
  // Rounds
  //

  readonly loadingRoundSig = new Sig<boolean>(false);

  readonly roundSig = new Sig<Round>();
  private readonly _round = this.roundSig.get();

  readonly roundIdSig = new Sig<string>();

  readonly editRoundSig = new Sig<Round>();
  readonly editRoundIdSig = new Sig<string>();
  readonly loadingEditRoundSig = new Sig<boolean>(false);

  readonly roundsMapSig = new Sig<Map<string, Round>>();
  private readonly _roundsMap = this.roundsMapSig.get();
  readonly loadingRoundsMapSig = new Sig<boolean>(false);

  readonly roundsOrderUpdatedSig = new Sig<string[]>();
  private readonly _roundsOrderUpdated = this.roundsOrderUpdatedSig.get();

  readonly roundsOrder = computed(() => {

    const user = this._user();
    const roundsOrderUpdated = this._roundsOrderUpdated();

    if (!user) {
      return undefined;
    }

    if (roundsOrderUpdated) {
      this.roundsOrderUpdatedSig.set(undefined);
      return roundsOrderUpdated;
    }

    return user.roundsIds;
  });

  readonly roundsList = computed(() => {

    const roundsOrder = this.roundsOrder() || [];
    const roundsMap = this._roundsMap() || new Map<string, Round>();

    return roundsOrder.filter((roundId) => roundsMap.get(roundId)).map((roundId) => roundsMap.get(roundId)) as Round[];
  });

  //
  // Today items
  //

  readonly todayTasksLoadingSig = new Sig<boolean>(false);
  readonly todayTasksSig = new Sig<TodayTask[]>();

  private _todayItems = signal<{[p: string]: TodayItem[]}>({});

  readonly todayItems = computed(() => {

    const round = this._round();
    const todayItems = this._todayItems();

    if (!round || !todayItems) {
      return undefined;
    }

    return round.timesOfDayIds.filter((timeOfDay) => todayItems[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: todayItems[timeOfDay]
    }));
  });

  readonly todaySig = new Sig<{full: string, short: Day}>();
  readonly dayToSetInEditorSig = new Sig<Day>();

  readonly nowSig = new Sig<Date>(new Date());
  private readonly _now = this.nowSig.get();

  readonly daySig = new Sig<{full: string, short: Day}>();

  readonly todayMapSig = new Sig<Map<string, Today>>();
  readonly todayMapLoadingSig = new Sig<boolean>(false);

  //
  // Tasks list
  //

  readonly tasksSig = new Sig<Task[]>();
  readonly tasksLoadingSig = new Sig(false);

  //
  // Task edit
  //
  dayToApply = signal<Day | null>(null);

  constructor(
    private readonly _functionsService: FunctionsService,
    private readonly _authService: AuthService
  ) {

    effect(() => {

      const now = this._now();

      if (!now) {
        return;
      }

      this.todaySig.set({
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        short: (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[now.getDay()]
      });
    });
  }

  saveRound(name: string, roundId: string = 'null'): Observable<{roundId: string, details: string, created: boolean}> {
    return this._functionsService.httpsCallable<{roundId: string, name: string}, {
      roundId: string,
      details: string,
      created: boolean
    }>('roundsSaveRoundUrl', {
      roundId,
      name
    });
  }

  deleteRound(id: string): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<string, any>('roundsDeleteRoundUrl', id);
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('roundsSetRoundsOrderUrl', data);
  }

  setTimesOfDayOrder(data: {timeOfDay: string, moveBy: number, roundId: string}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      timeOfDay: string,
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('roundsSetTimesOfDayOrderUrl', data);
  }

  saveTask(data: {
    task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]},
    taskId: string,
    roundId: string
  }): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]},
      taskId: string,
      roundId: string
    }, HTTPSuccess>('roundsSaveTaskUrl', data);
  }

  deleteTask(data: {taskId: string, roundId: string}): Observable<HTTPSuccess> {
    return this._functionsService.httpsCallable<{
      taskId: string,
      roundId: string
    }, HTTPSuccess>('roundsDeleteTaskUrl', data);
  }
}
