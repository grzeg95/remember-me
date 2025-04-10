import {NgTemplateOutlet} from '@angular/common';
import {Component, DestroyRef, effect, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTableModule} from '@angular/material/table';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import 'global.prototype';
import {Firestore, limit} from 'firebase/firestore';
import {catchError, of, Subscription, takeWhile} from 'rxjs';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {Day} from '../../models/day';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round} from '../../models/round';
import {Task} from '../../models/task';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {collectionSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service'

@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks-list.component.html',
  imports: [
    MatProgressBarModule,
    MatTableModule,
    MatButtonModule,
    FontAwesomeModule,
    NgTemplateOutlet
  ],
  styleUrls: ['./tasks-list.component.scss'],
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class TasksListComponent implements OnDestroy {

  protected readonly _isOnline = toSignal(this._connectionService.isOnline$);
  protected readonly _round = toSignal(this._roundsService.round$);
  protected readonly _tasks = toSignal(this._roundsService.tasks$);

  protected readonly _user = toSignal(this._authService.user$);
  protected readonly _cryptoKey = toSignal(this._authService.cryptoKey$);

  protected readonly _RouterDict = RouterDict;
  protected readonly _faEdit = faEdit;
  protected readonly _displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  private _tasksListSub: Subscription | undefined;

  private _ngOnInitTasksListSub: Subscription | undefined;

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    private readonly _connectionService: ConnectionService,
    private readonly _router: Router,
    private readonly _activatedRoute: ActivatedRoute,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    // tasksList
    let tasksList_userId: string | undefined;
    let tasksList_roundId: string | undefined;
    effect(() => {

      const user = this._user();
      const round = this._round();
      const cryptoKey = this._cryptoKey();

      if (!user || !round || !cryptoKey) {
        tasksList_userId = undefined;
        tasksList_roundId = undefined;
        this._tasksListSub && !this._tasksListSub.closed && this._tasksListSub.unsubscribe();
        this._roundsService.tasks$.next(undefined);
        return;
      }

      if (
        tasksList_userId === user.id &&
        tasksList_roundId === round.id
      ) {
        return;
      }

      tasksList_userId = user.id;
      tasksList_roundId = round.id

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, round.id);
      const tasksRef = Task.refs(roundRef);

      this._roundsService.todayTasksLoading$.next(true);
      this._tasksListSub && !this._tasksListSub.closed && this._tasksListSub.unsubscribe();
      this._tasksListSub = collectionSnapshots(tasksRef, limit(25)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._round()),
        catchError(() => of(null))
      ).subscribe(async (querySnapTasks) => {

        this._roundsService.tasksLoading$.next(false);

        if (!querySnapTasks) {
          this._roundsService.tasksLoading$.next(undefined);
          return;
        }

        const tasks: Task[] = [];

        for (const querySnapTask of querySnapTasks.docs) {
          tasks.push(await Task.data(querySnapTask, cryptoKey));
        }

        this._roundsService.tasks$.next(tasks);
      });
    }, {allowSignalWrites: true});
  }

  getDaysOfTheWeek(daysOfTheWeek: Day[]) {

    if (daysOfTheWeek.length === 7) {
      return 'Every day';
    }

    return daysOfTheWeek.join(', ');
  }

  getTimesOfDay(timesOfDayOrder: string[], taskTimesOfDay: string[]): string[] {
    const taskTimesOfDaySet = taskTimesOfDay.toSet();
    return timesOfDayOrder.filter((timeOfDayOrderItem) => taskTimesOfDaySet.has(timeOfDayOrderItem));
  }

  goToTask(taskId?: string) {
    if (!taskId) {
      this._router.navigate(['../', this._RouterDict.taskEditor], {relativeTo: this._activatedRoute})
    } else {
      this._router.navigate(['../', this._RouterDict.taskEditor, taskId], {relativeTo: this._activatedRoute})
    }
  }

  ngOnDestroy(): void {
    this._ngOnInitTasksListSub?.unsubscribe();
    this._roundsService.tasks$.next(undefined);
    this._roundsService.tasksLoading$.next(false);
  }
}
