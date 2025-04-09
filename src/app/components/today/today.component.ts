import {AsyncPipe, NgTemplateOutlet} from '@angular/common';
import {Component, computed, DestroyRef, effect, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {DocumentReference, FieldPath, Firestore, limit, updateDoc} from 'firebase/firestore';
import {catchError, combineLatest, defer, map, NEVER, of, share, Subscription, takeWhile} from 'rxjs';
import {take} from 'rxjs/operators';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Day} from '../../models/day';
import {Round, RoundDoc} from '../../models/round';
import {Today, TodayDoc} from '../../models/today';
import {TodayItem} from '../../models/today-item';
import {TodayTask, TodayTaskDoc} from '../../models/today-task';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {collectionSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-today',
  standalone: true,
  templateUrl: './today.component.html',
  imports: [
    MatButtonModule,
    FontAwesomeModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgTemplateOutlet,
    AsyncPipe
  ],
  styleUrl: './today.component.scss',
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class TodayComponent implements OnDestroy {

  private _todayMapSub: Subscription | undefined;
  private _todaySub: Subscription | undefined;
  private _todayTasksMapSub: Subscription | undefined;

  protected readonly _todayMap$ = this._roundsService.todayMap$;
  protected readonly _todayTasks$ = this._roundsService.todayTasks$;

  protected readonly _today$ = this._roundsService.today$;
  protected readonly _isOnline$ = this._connectionService.isOnline$;
  protected readonly _round$ = this._roundsService.round$;

  protected readonly _user$ = this._authService.user$;
  protected readonly _cryptoKey$ = this._authService.cryptoKey$;

  protected readonly _todayView$ = combineLatest([
    this._round$,
    this._todayTasks$,
    this._today$,
    this._todayMap$
  ]).pipe(
    map(([round, todayTasks, today, todayMap]) => {
      if (!round || !todayTasks || !today || !todayMap) {
        return undefined;
      }

      const todayTasksByTimeOfDay: {[timeOfDay: string]: TodayItem[]} = {};

      for (const todayTask of todayTasks) {

        Object.keys(todayTask.timesOfDayEncryptedMap).forEach((timeOfDay) => {

          if (!todayTasksByTimeOfDay[timeOfDay]) {
            todayTasksByTimeOfDay[timeOfDay] = [];
          }

          todayTasksByTimeOfDay[timeOfDay].push({
            description: todayTask.decryptedDescription,
            done: todayTask.timesOfDay[todayTask.timesOfDayEncryptedMap[timeOfDay]],
            id: todayTask.id,
            disabled: false,
            dayOfTheWeekId: todayMap.get(today.short)?.id || '',
            timeOfDayEncrypted: todayTask.timesOfDayEncryptedMap[timeOfDay]
          });
        });
      }

      return round.timesOfDay.filter((timeOfDayId) => todayTasksByTimeOfDay[timeOfDayId]).map((timeOfDay) => ({
        timeOfDay,
        done: todayTasksByTimeOfDay[timeOfDay].every((task) => task.done),
        tasks: todayTasksByTimeOfDay[timeOfDay]
      })) || [];
    })
  );

  protected readonly _faCheckCircle = faCheckCircle;

  constructor(
    private readonly _authService: AuthService,
    private readonly _roundsService: RoundsService,
    private readonly _snackBar: MatSnackBar,
    private readonly _router: Router,
    private readonly _route: ActivatedRoute,
    private readonly _connectionService: ConnectionService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    // todayMap
    let todayMap_userId: string | undefined;
    let todayMap_roundId: string | undefined;
    combineLatest([
      this._user$,
      this._round$,
      this._cryptoKey$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([user, round, cryptoKey]) => {

      if (!user || !round || !cryptoKey) {
        this._router.navigate(['/']);
        this._roundsService.todayMap$.next(undefined);
        this._roundsService.todayMapLoading$.next(false);
        todayMap_userId = undefined;
        todayMap_roundId = undefined;
        this._todayMapSub && !this._todayMapSub.closed && this._todayMapSub.unsubscribe();
        return;
      }

      if (
        todayMap_userId === user.id &&
        todayMap_roundId === round.id
      ) {
        return;
      }

      todayMap_userId = user.id;
      todayMap_roundId = round.id;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, round.id);
      const todayRef = Today.refs(roundRef);

      this._roundsService.todayMapLoading$.next(true);
      this._todayMapSub && !this._todayMapSub.closed && this._todayMapSub.unsubscribe();
      this._todayMapSub = collectionSnapshots(todayRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        // catchError(() => of(null))
      ).subscribe(async (querySnapTodayList) => {

        this._roundsService.todayMapLoading$.next(false);

        if (!querySnapTodayList) {
          this._roundsService.todayMap$.next(undefined);
          return;
        }

        const todayMap: Map<string, Today> = new Map<string, Today>();

        for (const querySnapToday of querySnapTodayList.docs) {

          const today = await Today.data(querySnapToday, cryptoKey);
          todayMap.set(today.name, today);
        }

        this._roundsService.todayMap$.next(todayMap);
      });
    });

    // todayTasks
    let todayTasks_userId: string | undefined;
    let todayTasks_todayNameShort: Day | undefined;
    combineLatest([
      this._user$,
      this._round$,
      this._today$,
      this._todayMap$,
      this._cryptoKey$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([user, round, today, todayMap, cryptoKey]) => {

      if (!user || !round || !today || !todayMap || !cryptoKey) {
        todayTasks_userId = undefined;
        todayTasks_todayNameShort = undefined;
        this._todaySub && !this._todaySub.closed && this._todaySub.unsubscribe();
        this._roundsService.todayTasks$.next(undefined);
        return;
      }

      if (
        todayTasks_userId === user.id &&
        todayTasks_todayNameShort === today.short
      ) {
        return;
      }

      todayTasks_userId = user.id;
      todayTasks_todayNameShort = today.short;

      const todayMapItem = todayMap.get(today.short);

      if (!todayMapItem) {
        this._roundsService.todayTasks$.next([]);
        return;
      }

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, round.id);
      const todayRef = Today.ref(roundRef, todayMapItem.id);
      const todayTasksRefs = TodayTask.refs(todayRef);

      this._roundsService.todayTasksLoading$.next(true);
      this._todayTasksMapSub && !this._todayTasksMapSub.closed && this._todayTasksMapSub.unsubscribe();
      this._todayTasksMapSub = collectionSnapshots(todayTasksRefs, limit(25)).pipe(
        takeUntilDestroyed(this._destroyRef),
        catchError(() => of(null))
      ).subscribe(async (querySnapTodayTasks) => {

        this._roundsService.todayTasksLoading$.next(false);

        if (!querySnapTodayTasks) {
          this._roundsService.todayTasks$.next(undefined);
          return;
        }

        const todayTasks: TodayTask[] = [];

        for (const querySnapTodayTask of querySnapTodayTasks.docs) {
          todayTasks.push(await TodayTask.data(querySnapTodayTask, cryptoKey));
        }

        this._roundsService.todayTasks$.next(todayTasks);
      });
    });
  }

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    combineLatest([
      this._authService.firebaseUser$,
      this._roundsService.round$
    ]).pipe(
      take(1)
    ).subscribe(([firebaseUser, round]) => {

      if (!firebaseUser || !round) {
        return;
      }

      const userRef = User.ref(this._firestore, firebaseUser.uid);
      const roundRef = Round.ref(userRef, round.id) as DocumentReference<Round, RoundDoc>
      const todayRef = Today.ref(roundRef, todayItem.dayOfTheWeekId) as DocumentReference<Today, TodayDoc>;
      const todayTaskRef = TodayTask.ref(todayRef, todayItem.id) as DocumentReference<TodayTask, TodayTaskDoc>;

      todayItem.disabled = true;
      defer(() => updateDoc(
        todayTaskRef,
        new FieldPath('timesOfDay', todayItem.timeOfDayEncrypted),
        !todayItem.done
      )).pipe(catchError(() => {
        todayItem.disabled = false;
        this._snackBar.open('Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })).subscribe(() => {
        todayItem.disabled = false;
      });

      if (!this._isOnline$.value) {
        todayItem.disabled = false;
        todayItem.done = !todayItem.done;
      }
    });
  }

  addNewTask(): void {

    combineLatest([
      this._roundsService.today$
    ]).pipe(
      take(1)
    ).subscribe(([today]) => {

      if (!today) {
        return;
      }

      this._router.navigate(['../', RouterDict.taskEditor], {relativeTo: this._route});
    });
  }

  ngOnDestroy(): void {
    this._roundsService.todayMap$.next(undefined);
    this._roundsService.todayMapLoading$.next(false);
    this._roundsService.todayTasks$.next(undefined);
    this._roundsService.todayTasksLoading$.next(false);
  }
}
