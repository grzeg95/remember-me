import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {Day, ITask, ITaskFirestore, Task, TasksListItem, TodayItem} from './models';
import {TaskService} from './task/task.service';

@Injectable()
export class UserService {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this._setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this._setTimesOfDayOrderSub;
  }

  private _setTimesOfDayOrderSub: Subscription;
  private _lastTodayName = '.';

  todayFirstLoading$ = new BehaviorSubject<boolean>(true);
  tasksFirstLoading$ = new BehaviorSubject<boolean>(true);
  timesOfDayOrderFirstLoading$ = new BehaviorSubject<boolean>(true);
  today$ = new BehaviorSubject<{[p: string]: TodayItem[]}>({});
  now$ = new BehaviorSubject<Date>(new Date());
  tasks$ = new BehaviorSubject<TasksListItem[]> ([]);
  timesOfDay$ = new BehaviorSubject<string[]>([]);
  todayName$ = new BehaviorSubject<string>('');
  todayFullName$ = new BehaviorSubject<string>('');

  private todaySub: Subscription;
  private tasksSub: Subscription;
  private subs: Subscription[] = [];

  clearCache(): void {

    this.today$.next({});
    this.tasks$.next([]);
    this.timesOfDay$.next([]);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);
    this.timesOfDayOrderFirstLoading$.next(true);

    this.subs.forEach((sub) => {
      if (!sub.closed) {
        sub.unsubscribe();
      }
    });

    this.subs = [];

    if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
      this.setTimesOfDayOrderSub.unsubscribe();
    }

  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService,
              private fns: AngularFireFunctions,
              private appService: AppService,
              private taskService: TaskService) {
  }

  init(): void {
    this.subs.push(this.appService.isConnected$.subscribe((isConnected) => {
      if (!isConnected) {
        this.tasksFirstLoading$.next(true);
        this.todayFirstLoading$.next(true);
        this.timesOfDayOrderFirstLoading$.next(true);
        if (this._setTimesOfDayOrderSub && !this._setTimesOfDayOrderSub.closed) {
          this._setTimesOfDayOrderSub.unsubscribe();
        }
      }
    }));

    this.subs.push(this.now$.subscribe((now) => {
      this.todayFullName$.next(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      this.todayName$.next(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    }));

    this.subs.push(this.authService.user$.subscribe((user) => {
      if (user) {
        this.timesOfDay$.next(user.timesOfDay);
        this.timesOfDayOrderFirstLoading$.next(false);
      }
    }));
  }

  runToday(): void {
    this.now$.next(new Date());

    if (this._lastTodayName !== this.todayName$.getValue() && this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }
    this._lastTodayName = this.todayName$.getValue();

    if (this.todaySub && !this.todaySub.closed) {
      return;
    }

    this.todaySub = this.afs.doc(`users/${this.authService.userData.uid}/today/${this.todayName$.getValue()}`)
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
                id: documentChangeAction.payload.doc.id
              });
            });

          });

          return todayTasksByTimeOfDay;

        })
      ).subscribe((today) => {
        if (today) {
          this.today$.next(today);
          this.todayFirstLoading$.next(false);
        }
      });

    this.subs.push(this.todaySub);
  }

  runTasks(): void {
    if (this.tasksSub && !this.tasksSub.closed) {
      return;
    }

    this.tasksSub = this.afs.doc(`users/${this.authService.userData.uid}/`)
      .collection<ITaskFirestore>('task', (ref) => ref.orderBy('description', 'asc').limit(25))
      .snapshotChanges().pipe(
        map((documentChangeActionArr) =>
          documentChangeActionArr.map((documentChangeAction) => {

            const task = documentChangeAction.payload.doc.data() as ITaskFirestore;
            const daysOfTheWeek: string[] = (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[])
              .filter((dayOfTheWeek) => this.taskService.dayIsInNumber(task.daysOfTheWeek, dayOfTheWeek));

            return {
              description: task.description,
              timesOfDay: task.timesOfDay,
              daysOfTheWeek: daysOfTheWeek.length === 7 ? 'Every day' : daysOfTheWeek.join(', '),
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

    this.subs.push(this.tasksSub);
  }

  getTaskById$(id: string): Observable<ITask> {
    return this.afs.doc<ITaskFirestore>(`users/${this.authService.userData.uid}/task/${id}`).get().pipe(
      map((taskDocSnap) => {
        const iTaskFirestore = taskDocSnap.data();
        return {
          description: iTaskFirestore.description,
          daysOfTheWeek: this.taskService.numberToDaysBooleanMap(iTaskFirestore.daysOfTheWeek),
          timesOfDay: [...iTaskFirestore.timesOfDay]
        } as ITask;
      })
    );
  }

  updateTimesOfDayOrder(timeOfDay: string, moveBy: number): Observable<{[key: string]: string}> {
    return this.fns.httpsCallable('setTimesOfDayOrder')([timeOfDay, moveBy]);
  }

}
