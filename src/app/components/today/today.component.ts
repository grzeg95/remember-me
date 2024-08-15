import {NgTemplateOutlet} from '@angular/common';
import {Component, computed, DestroyRef, effect, Inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {CollectionReference, DocumentReference, FieldPath, Firestore, updateDoc} from 'firebase/firestore';
import {catchError, defer, NEVER, of, Subscription, takeWhile} from 'rxjs';
import {RouterDict} from '../../app.constants';
import {Day} from '../../models/day';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round, RoundDoc} from '../../models/round';
import {Today, TodayDoc} from '../../models/today';
import {TodayItem} from '../../models/today-item';
import {TodayTask, TodayTaskDoc} from '../../models/today-task';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {RoundsService} from '../../services/rounds.service';
import {collectionSnapshots} from '../../utils/firestore';

@Component({
  selector: 'app-today',
  standalone: true,
  templateUrl: './today.component.html',
  imports: [
    MatButtonModule,
    FontAwesomeModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgTemplateOutlet
  ],
  styleUrl: './today.component.scss'
})
export class TodayComponent {

  private _todayMapSub: Subscription | undefined;
  private _todaySub: Subscription | undefined;
  private _todayTasksMapSub: Subscription | undefined;

  protected readonly _todayMap = this._roundsService.todayMapSig.get();
  protected readonly _todayTasks = this._roundsService.todayTasksSig.get();
  protected readonly _todayTasksLoading = this._roundsService.todayTasksLoadingSig.get();

  protected readonly _today = this._roundsService.todaySig.get();
  protected readonly _isOnline = this._connectionService.isOnlineSig.get();
  protected readonly _round = this._roundsService.roundSig.get();

  protected readonly _user = this._authService.userSig.get();

  protected readonly _todayList = computed(() => {

    const round = this._round();
    const todayTasks = this._todayTasks();
    const today = this._today();

    if (!round || !todayTasks || !today) {
      return undefined;
    }

    const todayTasksByTimeOfDay: {[timeOfDay: string]: TodayItem[]} = {};

    for (const todayTask of todayTasks) {

      Object.keys(todayTask.timesOfDay).forEach((timeOfDay) => {

        if (!todayTasksByTimeOfDay[timeOfDay]) {
          todayTasksByTimeOfDay[timeOfDay] = [];
        }

        todayTasksByTimeOfDay[timeOfDay].push({
          description: todayTask.description,
          done: todayTask.timesOfDay[timeOfDay],
          id: todayTask.id,
          disabled: false,
          dayOfTheWeekId: today.short,
          timeOfDayIdEncrypted: todayTask.timesOfDayEncryptedMap[timeOfDay]
        });
      });
    }

    return round.timesOfDayIds.filter((timeOfDayId) => todayTasksByTimeOfDay[timeOfDayId]).map((timeOfDay) => ({
      timeOfDay,
      tasks: todayTasksByTimeOfDay[timeOfDay]
    })) || [];
  });

  protected readonly _RouterDict = RouterDict;
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
    effect(() => {

      const user = this._user();
      const round = this._round();

      if (!user || !round) {
        this._router.navigate(['/']);
        this._roundsService.todayMapSig.set(undefined);
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

      const cryptoKey = user.cryptoKey;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef) as DocumentReference<Round, RoundDoc>;
      const todayRef = Today.ref(roundRef) as CollectionReference<Today, TodayDoc>;

      this._roundsService.todayMapLoadingSig.set(true);
      this._todayMapSub && !this._todayMapSub.closed && this._todayMapSub.unsubscribe();
      this._todayMapSub = collectionSnapshots(todayRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._round()),
        catchError(() => of(null))
      ).subscribe(async (querySnapTodayList) => {

        this._roundsService.todayMapLoadingSig.set(false);

        if (!querySnapTodayList) {
          this._roundsService.todayMapSig.set(undefined);
          return;
        }

        const querySnapBoardStatusesMap = new Map<string, Today>();

        for (const querySnapToday of querySnapTodayList.docs) {
          querySnapBoardStatusesMap.set(querySnapToday.id, await Today.data(querySnapToday, cryptoKey));
        }

        this._roundsService.todayMapSig.set(querySnapBoardStatusesMap);
      });
    });

    // todayTasks
    let todayTasks_userId: string | undefined;
    let todayTasks_todayNameShort: Day | undefined;
    effect(() => {

      const user = this._user();
      const today = this._today();

      if (!user || !today) {
        todayTasks_userId = undefined;
        todayTasks_todayNameShort = undefined;
        this._todaySub && !this._todaySub.closed && this._todaySub.unsubscribe();
        this._roundsService.todayTasksSig.set(undefined);
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

      const cryptoKey = user.cryptoKey;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef) as DocumentReference<Round, RoundDoc>;
      const todayRef = Today.ref(roundRef, today.short) as DocumentReference<Today, TodayDoc>;
      const todayTasksRef = TodayTask.ref(todayRef) as CollectionReference<TodayTask, TodayTaskDoc>;

      this._roundsService.todayTasksLoadingSig.set(true);
      this._todayTasksMapSub && !this._todayTasksMapSub.closed && this._todayTasksMapSub.unsubscribe();
      this._todayTasksMapSub = collectionSnapshots(todayTasksRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user()),
        catchError(() => of(null))
      ).subscribe(async (querySnapTodayTasks) => {

        this._roundsService.todayTasksLoadingSig.set(false);

        if (!querySnapTodayTasks) {
          this._roundsService.todayTasksSig.set(undefined);
          return;
        }

        const todayTasks: TodayTask[] = [];

        for (const querySnapTodayTask of querySnapTodayTasks.docs) {
          todayTasks.push(await TodayTask.data(querySnapTodayTask, cryptoKey));
        }

        this._roundsService.todayTasksSig.set(todayTasks);
      });
    });
  }

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    const firebaseUser = this._authService.firebaseUser();
    const round = this._roundsService.roundSig.get()();

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
      new FieldPath('timesOfDay', todayItem.timeOfDayIdEncrypted),
      !todayItem.done
    )).pipe(catchError(() => {
      todayItem.disabled = false;
      this._snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe(() => {
      todayItem.disabled = false;
    });

    if (!this._isOnline()) {
      todayItem.disabled = false;
      todayItem.done = !todayItem.done;
    }
  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this._todayList()?.find((todayItem) => todayItem.timeOfDay === timeOfDay)?.tasks.some((task) => !task.done);
  }

  addNewTask(): void {

    const todayName = this._roundsService.todaySig.get()();

    if (!todayName) {
      return;
    }

    this._roundsService.dayToSetInEditorSig.set(todayName.short);
    this._router.navigate(['../', RouterDict.taskEditor], {relativeTo: this._route});
  }
}
