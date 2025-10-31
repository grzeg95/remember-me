import {NgTemplateOutlet} from '@angular/common';
import {Component, computed, DestroyRef, effect, inject, OnDestroy, ViewEncapsulation} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {FieldPath, limit, updateDoc} from 'firebase/firestore';
import {catchError, defer, NEVER, of, Subscription, takeWhile} from 'rxjs';
import {Day} from '../../models/firestore/Day';
import {getRoundRef} from '../../models/firestore/Round';
import {getTodayRef} from '../../models/firestore/Today';
import {getTodayTaskRef, getTodayTaskRefs, TodayTask} from '../../models/firestore/TodayTask';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {RouterDict} from '../../models/router-dict';
import {TodayItem} from '../../models/today-item';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {Button} from '../../ui/button/button';
import {Loader} from '../../ui/loader/loader';
import {LoaderDefer} from '../../ui/loader/loader-defer/loader-defer';
import {LoaderLoading} from '../../ui/loader/loader-loading/loader-loading';
import {SkeletonComponent} from '../../ui/skeleton/skeleton.component';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {Spinner} from '../../ui/spinner/spinner';
import {collectionSnapshots} from '../../utils/firestore';

@Component({
  selector: 'app-today',
  standalone: true,
  templateUrl: './today.html',
  imports: [
    NgTemplateOutlet,
    FaIconComponent,
    Button,
    SkeletonComponent,
    LoaderDefer,
    LoaderLoading,
    Loader,
    Spinner
  ],
  styleUrl: './today.scss',
  encapsulation: ViewEncapsulation.None
})
export class Today implements OnDestroy {

  private readonly _authService = inject(Auth);
  private readonly _rounds = inject(Rounds);
  private readonly _snackBar = inject(SnackBar);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _connection = inject(Connection);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _destroyRef = inject(DestroyRef);

  private _todaySub: Subscription | undefined;
  private _todayTasksMapSub: Subscription | undefined;

  protected readonly _todayTasks = toSignal(this._rounds.todayTasks$);
  protected readonly _today = toSignal(this._rounds.today$);
  protected readonly _isOnline = toSignal(this._connection.isOnline$);
  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  protected readonly _user = toSignal(this._authService.firestoreUser$);

  protected readonly _todayView = computed(() => {

    const selectedRound = this._selectedRound();
    const todayTasks = this._todayTasks();
    const today = this._today();

    if (!selectedRound || !todayTasks || !today) {
      return undefined;
    }

    return selectedRound.timesOfDay.map((timeOfDay) => {

      const tasks = todayTasks.filter((todayTask) => todayTask.timesOfDay.hasOwnProperty(timeOfDay)).map((todayTask) => {
        return {
          description: todayTask.description,
          done: todayTask.timesOfDay[timeOfDay],
          id: todayTask.id,
          disabled: false,
          day: today.short,
          timeOfDay: timeOfDay
        } as TodayItem;
      }).sort((a, b) => a.description.localeCompare(b.description));

      return {
        timeOfDay,
        done: tasks.every((todayTask) => todayTask.done),
        tasks
      }
    }).filter((todayItem) => todayItem.tasks.length > 0);
  });

  protected readonly _faCheckCircle = faCheckCircle;

  constructor() {

    // todayTasks
    let todayTasks_userUid: string | undefined;
    let todayTasks_todayNameShort: Day | undefined;
    effect(() => {

      const user = this._user();
      const selectedRound = this._selectedRound();
      const today = this._today();

      if (!user || !selectedRound || !today) {
        todayTasks_userUid = undefined;
        todayTasks_todayNameShort = undefined;
        this._todaySub && !this._todaySub.closed && this._todaySub.unsubscribe();
        this._rounds.todayTasks$.next(undefined);
        return;
      }

      if (
        todayTasks_userUid === user.uid &&
        todayTasks_todayNameShort === today.short
      ) {
        return;
      }

      todayTasks_userUid = user.uid;
      todayTasks_todayNameShort = today.short as Day;

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundRef = getRoundRef(userRef, selectedRound.id);
      const todayRef = getTodayRef(roundRef, today.short);
      const todayTaskRefs = getTodayTaskRefs(todayRef);

      this._rounds.todayTasksLoading$.next(true);
      this._todayTasksMapSub && !this._todayTasksMapSub.closed && this._todayTasksMapSub.unsubscribe();
      this._todayTasksMapSub = collectionSnapshots(todayTaskRefs, limit(25)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user()),
        catchError(() => of(null))
      ).subscribe(async (querySnapTodayTasks) => {

        this._rounds.todayTasksLoading$.next(false);

        if (!querySnapTodayTasks) {
          this._rounds.todayTasks$.next(undefined);
          return;
        }

        const todayTasks: TodayTask[] = [];

        for (const querySnapTodayTask of querySnapTodayTasks.docs) {
          todayTasks.push(querySnapTodayTask.data());
        }

        this._rounds.todayTasks$.next(todayTasks);
      });
    });
  }

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    const uid = this._user()?.uid;
    const selectedRound = this._selectedRound();

    if (!uid || !selectedRound) {
      return;
    }

    const userRef = getFirestoreUserRef(this._firestore, uid);
    const roundRef = getRoundRef(userRef, selectedRound.id);
    const todayRef = getTodayRef(roundRef, todayItem.day);
    const todayTaskRef = getTodayTaskRef(todayRef, todayItem.id);

    todayItem.disabled = true;
    defer(() => updateDoc(
      todayTaskRef,
      new FieldPath('timesOfDay', todayItem.timeOfDay),
      !todayItem.done
    )).pipe(catchError(() => {
      todayItem.disabled = false;
      this._snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe(() => {
      todayItem.disabled = false;
    });

    const isOnline = this._isOnline();

    if (!isOnline) {
      todayItem.disabled = false;
      todayItem.done = !todayItem.done;
    }
  }

  addNewTask(): void {

    const today = this._today();

    if (!today) {
      return;
    }

    this._rounds.dayToSetInEditor$.next(today.short);
    this._router.navigate(['../', RouterDict.taskEditor], {relativeTo: this._route});
  }

  ngOnDestroy(): void {
    this._rounds.todayTasks$.next(undefined);
    this._rounds.todayTasksLoading$.next(false);
  }
}
