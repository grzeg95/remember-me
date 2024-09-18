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
import { Task } from '../models/task';
import {FunctionsService} from './functions.service';

@Injectable()
export class RoundsService {

  private readonly _user = this._authService.userSig.get();

  //
  // Rounds
  //

  readonly loadingRoundSig = new Sig<boolean>(false);

  readonly roundSig = new Sig<Round | undefined>(undefined);
  private readonly _round = this.roundSig.get();

  readonly roundIdSig = new Sig<string | null | undefined>(undefined);

  readonly editRoundSig = new Sig<Round | undefined>(undefined);
  readonly editRoundIdSig = new Sig<string | null | undefined>(undefined);
  readonly loadingEditRoundSig = new Sig<boolean>(false);

  readonly roundsMapSig = new Sig<Map<string, Round> | undefined>(undefined);
  private readonly _roundsMap = this.roundsMapSig.get();
  readonly loadingRoundsMapSig = new Sig<boolean>(false);

  readonly roundsOrderUpdatedSig = new Sig<string[] | undefined>(undefined);
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

    return user.decryptedRounds;
  });

  readonly roundsList = computed(() => {

    const roundsOrder = this.roundsOrder();
    const roundsMap = this._roundsMap();

    if (!roundsOrder || !roundsMap) {
      return undefined;
    }

    return roundsOrder.filter((roundId) => roundsMap.get(roundId)).map((roundId) => roundsMap.get(roundId)) as Round[];
  });

  //
  // Today items
  //

  readonly todayTasksLoadingSig = new Sig<boolean>(false);
  readonly todayTasksSig = new Sig<TodayTask[] | undefined>(undefined);

  private _todayItems = signal<{[p: string]: TodayItem[]}>({});

  readonly todayItems = computed(() => {

    const round = this._round();
    const todayItems = this._todayItems();

    if (!round || !todayItems) {
      return undefined;
    }

    return round.timesOfDay.filter((timeOfDay) => todayItems[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: todayItems[timeOfDay]
    }));
  });

  readonly todaySig = new Sig<{full: string, short: Day} | undefined>(undefined);
  readonly dayToSetInEditorSig = new Sig<Day | undefined>(undefined);

  readonly nowSig = new Sig<Date>(new Date());
  private readonly _now = this.nowSig.get();

  readonly daySig = new Sig<{full: string, short: Day} | undefined>(undefined);

  readonly todayMapSig = new Sig<Map<string, Today> | undefined>(undefined);
  readonly todayMapLoadingSig = new Sig<boolean>(false);

  //
  // Tasks list
  //

  readonly tasksSig = new Sig<Task[] | undefined>(undefined);
  readonly tasksLoadingSig = new Sig<boolean | undefined>(false);

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
