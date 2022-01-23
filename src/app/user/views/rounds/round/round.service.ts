import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {RouterDict} from '../../../../app.constants';
import {ITask, ITaskFirestore, Round, Task, TasksListItem, TodayItem} from '../../../models';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AuthService} from '../../../../auth/auth.service';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AppService} from '../../../../app-service';
import {TaskService} from './tasks/task/task.service';
import {filter, map, skip, take} from 'rxjs/operators';
import {RoundsService} from '../rounds.service';

@Injectable()
export class RoundService {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this._setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this._setTimesOfDayOrderSub;
  }

  get roundsOrderFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.roundsOrderFirstLoading$;
  }

  get todayFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.todayFirstLoading$;
  }

  get tasksFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.tasksFirstLoading$;
  }

  private _setTimesOfDayOrderSub: Subscription;

  today$ = new BehaviorSubject<{ [p: string]: TodayItem[] }>({});
  tasks$ = new BehaviorSubject<TasksListItem[]>([]);

  private todaySub: Subscription;
  private tasksListSub: Subscription;
  private lastRound: Round;

  clearCache(): void {

    this.today$.next({});
    this.tasks$.next([]);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);

    if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
      this.setTimesOfDayOrderSub.unsubscribe();
    }

    if (this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }

    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }
  }

  constructor(
    private afs: AngularFirestore,
    private authService: AuthService,
    private fns: AngularFireFunctions,
    private appService: AppService,
    private taskService: TaskService,
    private roundsService: RoundsService,
    private router: Router
  ) {
  }

  init(): void {
    this.appService.isOnline$.subscribe((isOnline) => {
      if (!isOnline) {
        this.tasksFirstLoading$.next(true);
        this.todayFirstLoading$.next(true);
        if (this._setTimesOfDayOrderSub && !this._setTimesOfDayOrderSub.closed) {
          this._setTimesOfDayOrderSub.unsubscribe();
        }
      }
    });

    this.roundsService.roundsListFirstLoad$.pipe(
      filter((roundsListFirstLoad) => roundsListFirstLoad),
      take(1)
    ).subscribe(() => {

      // Skąd mam wiedzieć, że ten null oznacza rezygnację
      // pod spodem musi być coś jeszcze
      this.roundsService.roundSelected$.pipe(skip(3)).subscribe((round) => {

        if (this.roundsService.inEditMode) {
          return;
        }

        if (round) {
          if (this.lastRound?.id !== round.id) {
            if (this.lastRound) {
              this.clearCache();
            } else {
              this.tasksFirstLoading$.next(true);
              this.todayFirstLoading$.next(true);
            }
          }
        } else {
          this.clearCache();
          this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
        }

        this.lastRound = round;
      });
    });
  }

  runToday(round: Round): void {

    if (this.roundsService.lastTodayName !== this.roundsService.todayName$.getValue() && this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }

    this.roundsService.lastTodayName = this.roundsService.todayName$.getValue();
    this.roundsService.now$.next(new Date());

    if (this.todaySub && !this.todaySub.closed || !round) {
      return;
    }

    this.todaySub = this.afs.doc(`users/${this.authService.userData.uid}/rounds/${round.id}/today/${this.roundsService.todayName$.value}`)
      .collection<Task>('task', (ref) => ref.orderBy('description', 'asc').limit(25))
      .snapshotChanges().pipe(
        map((documentChangeActionArr) => {

          const todayTasksByTimeOfDay: { [timeOfDay: string]: TodayItem[] } = {};

          documentChangeActionArr.forEach((documentChangeAction) => {

            const task: Task = documentChangeAction.payload.doc.data() as Task;

            Object.keys(task.timesOfDay).forEach((timeOfDay) => {
              if (!todayTasksByTimeOfDay[timeOfDay]) {
                todayTasksByTimeOfDay[timeOfDay] = [];
              }
              todayTasksByTimeOfDay[timeOfDay].push({
                description: task.description,
                done: task.timesOfDay[timeOfDay],
                id: documentChangeAction.payload.doc.id,
                disabled: false
              });
            });

          });

          return todayTasksByTimeOfDay;

        })
      ).subscribe((today) => {
        if (today) {
          this.today$.next(today);
        }
        this.todayFirstLoading$.next(false);
      });
  }

  runTasksList(round: Round): void {

    if (this.tasksListSub && !this.tasksListSub.closed || !round) {
      return;
    }

    this.tasksListSub = this.afs.doc(`users/${this.authService.userData.uid}/rounds/${round.id}`)
      .collection<ITaskFirestore>('task', (ref) => ref.orderBy('description', 'asc').limit(25))
      .snapshotChanges().pipe(
        map((documentChangeActionArr) =>
          documentChangeActionArr.map((documentChangeAction) => {

            const task = documentChangeAction.payload.doc.data() as ITaskFirestore;

            return {
              description: task.description,
              timesOfDay: task.timesOfDay,
              daysOfTheWeek: task.daysOfTheWeek.length === 7 ? 'Every day' : task.daysOfTheWeek.join(', '),
              id: documentChangeAction.payload.doc.id
            } as TasksListItem;
          })
        )
      ).subscribe((tasks) => {
        if (tasks) {
          this.tasks$.next(tasks);
          this.tasksFirstLoading$.next(false);
        }
      });
  }

  getTaskById$(id: string, roundId: string): Observable<ITask | undefined> {

    return this.afs.doc<ITaskFirestore>(`users/${this.authService.userData.uid}/rounds/${roundId}/task/${id}`).get().pipe(
      map((taskDocSnap) => {
        const iTaskFirestore = taskDocSnap.data();
        return !iTaskFirestore ? null : {
          description: iTaskFirestore.description,
          daysOfTheWeek: this.taskService.dayArrayToDaysBooleanMap(iTaskFirestore.daysOfTheWeek),
          timesOfDay: [...iTaskFirestore.timesOfDay]
        } as ITask;
      })
    );
  }

  updateTimesOfDayOrder(data: { timeOfDay: string, moveBy: number, roundId: string }): Observable<{ [key: string]: string }> {
    return this.fns.httpsCallable('setTimesOfDayOrder')(data);
  }
}
