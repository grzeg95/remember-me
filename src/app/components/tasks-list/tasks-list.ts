import {NgStyle, NgTemplateOutlet} from '@angular/common';
import {Component, DestroyRef, effect, inject, OnDestroy, ViewEncapsulation} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {limit} from 'firebase/firestore';
import {catchError, of, Subscription, takeWhile} from 'rxjs';
import {Day} from '../../models/firestore/Day';
import {getRoundRef} from '../../models/firestore/Round';
import {getTaskRefs, Task} from '../../models/firestore/Task';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {RouterDict} from '../../models/router-dict';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {Button} from '../../ui/button/button';
import {Loader} from '../../ui/loader/loader';
import {LoaderDefer} from '../../ui/loader/loader-defer/loader-defer';
import {LoaderLoading} from '../../ui/loader/loader-loading/loader-loading';
import {SkeletonComponent} from '../../ui/skeleton/skeleton.component';
import {collectionSnapshots} from '../../utils/firestore';

@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks-list.html',
  imports: [
    NgTemplateOutlet,
    SkeletonComponent,
    NgStyle,
    Button,
    FaIconComponent,
    Loader,
    LoaderDefer,
    LoaderLoading
  ],
  styleUrl: './tasks-list.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-tasks-list container'
  }
})
export class TasksList implements OnDestroy {

  private readonly _rounds = inject(Rounds);
  private readonly _auth = inject(Auth);
  private readonly _connection = inject(Connection);
  private readonly _router = inject(Router);
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _isOnline = toSignal(this._connection.isOnline$);
  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  protected readonly _tasks = toSignal(this._rounds.tasks$);
  protected readonly _tasksLoading = toSignal(this._rounds.tasksLoading$);

  protected readonly _user = toSignal(this._auth.firestoreUser$);

  protected readonly _RouterDict = RouterDict;
  protected readonly _faEdit = faEdit;

  private _tasksListSub: Subscription | undefined;

  private _ngOnInitTasksListSub: Subscription | undefined;

  constructor() {

    // tasksList
    let tasksList_userUid: string | undefined;
    let tasksList_selectedRoundId: string | undefined;
    effect(() => {

      const user = this._user();
      const selectedRound = this._selectedRound();

      if (!user || !selectedRound) {
        tasksList_userUid = undefined;
        tasksList_selectedRoundId = undefined;
        this._tasksListSub && !this._tasksListSub.closed && this._tasksListSub.unsubscribe();
        this._rounds.tasks$.next(undefined);
        return;
      }

      if (
        tasksList_userUid === user.uid &&
        tasksList_selectedRoundId === selectedRound.id
      ) {
        return;
      }

      tasksList_userUid = user.uid;
      tasksList_selectedRoundId = selectedRound.id

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundRef = getRoundRef(userRef, selectedRound.id);
      const tasksRef = getTaskRefs(roundRef);

      this._rounds.tasksLoading$.next(true);
      this._tasksListSub && !this._tasksListSub.closed && this._tasksListSub.unsubscribe();
      this._tasksListSub = collectionSnapshots(tasksRef, limit(25)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._selectedRound()),
        catchError(() => of(null))
      ).subscribe(async (querySnapTasks) => {

        this._rounds.tasksLoading$.next(false);

        if (!querySnapTasks) {
          return;
        }

        const tasks: Task[] = [];

        for (const querySnapTask of querySnapTasks.docs) {
          tasks.push(querySnapTask.data());
        }

        tasks.sort((a, b) => a.description.localeCompare(b.description));

        this._rounds.tasks$.next(tasks);
      });
    });
  }

  getDaysOfTheWeek(daysOfTheWeek: Day[]) {

    if (daysOfTheWeek.length === 7) {
      return 'Every day';
    }

    return daysOfTheWeek.join(', ');
  }

  getTimesOfDay(timesOfDayOrder: string[], taskTimesOfDay: string[]): string[] {
    return timesOfDayOrder.filter((timeOfDayOrderItem) => taskTimesOfDay.includes(timeOfDayOrderItem));
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
    this._rounds.tasks$.next(undefined);
    this._rounds.tasksLoading$.next(false);
  }
}
