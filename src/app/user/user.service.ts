import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {ITask, Task, TasksListItem, TimeOfDay, TimeOfDayFirestore, TodayItem} from './models';
import User = firebase.User;

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
  timesOfDayOrder$ = new BehaviorSubject<TimeOfDay[]>([]);
  todayName$ = new BehaviorSubject<string>('');
  todayFullName$ = new BehaviorSubject<string>('');

  private todaySub: Subscription;
  private tasksSub: Subscription;
  private timesOfDayOrderSub: Subscription;

  clearCache(): void {
    this.today$.next({});
    this.tasks$.next([]);
    this.timesOfDayOrder$.next([]);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);
    this.timesOfDayOrderFirstLoading$.next(true);

    if (this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }

    if (this.tasksSub && !this.tasksSub.closed) {
      this.tasksSub.unsubscribe();
    }

    if (this.timesOfDayOrderSub && !this.timesOfDayOrderSub.closed) {
      this.timesOfDayOrderSub.unsubscribe();
    }

    if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
      this.setTimesOfDayOrderSub.unsubscribe();
    }

  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService,
              private fns: AngularFireFunctions,
              private appService: AppService) {
    this.appService.isConnected$.subscribe((isConnected) => {
      if (!isConnected) {
        this.tasksFirstLoading$.next(true);
        this.todayFirstLoading$.next(true);
        this.timesOfDayOrderFirstLoading$.next(true);
        if (this._setTimesOfDayOrderSub && !this._setTimesOfDayOrderSub.closed) {
          this._setTimesOfDayOrderSub.unsubscribe();
        }
      }
    });

    this.now$.subscribe((now) => {
      this.todayFullName$.next(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      this.todayName$.next(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    });
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
      .collection<Task>('task', (ref) => ref.orderBy('description', 'asc').limit(50 * 20))
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
  }

  runTasks(): void {
    if (this.tasksSub && !this.tasksSub.closed) {
      return;
    }

    this.tasksSub = this.afs.doc<User>(`users/${this.authService.userData.uid}/`)
      .collection<Task>('task', (ref) => ref.orderBy('description', 'asc').limit(50))
      .snapshotChanges().pipe(
        map((documentChangeActionArr) =>
          documentChangeActionArr.map((documentChangeAction) => {

            const task = documentChangeAction.payload.doc.data() as Task;
            const daysOfTheWeek: string[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
              .filter((dayOfTheWeek) => task.daysOfTheWeek[dayOfTheWeek]);

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
  }

  runTimesOfDayOrder(): void {
    if (this.timesOfDayOrderSub && !this.timesOfDayOrderSub.closed) {
      return;
    }

    this.timesOfDayOrderSub = this.afs
      .doc<User>(`users/${this.authService.userData.uid}`)
      .collection<TimeOfDayFirestore>('timesOfDay', (ref) => ref.limit(20))
      .snapshotChanges()
      .subscribe((timesOfDay) => {
        if (timesOfDay) {

          const orderMap = {};
          let next: TimeOfDay = null;
          for (let i = timesOfDay.length - 1; i >= 0; --i) {
            const data = timesOfDay[i].payload.doc.data();
            orderMap[timesOfDay[i].payload.doc.id] = data;
            if (!data.prev) {
              next = {
                id: timesOfDay[i].payload.doc.ref.id,
                data: timesOfDay[i].payload.doc.data()
              };
            }
          }

          const order: TimeOfDay[] = [];
           while (next) {
            order.push(next);
            if (next.data.next) {
              next = {
                id: next.data.next,
                data: orderMap[next.data.next]
              };
            } else {
              next = null;
            }
          }

          this.timesOfDayOrder$.next(order);
          this.timesOfDayOrderFirstLoading$.next(false);
        }
      });
  }

  getTaskById$(id: string): Observable<ITask> {
    return this.afs.doc<User>(`users/${this.authService.userData.uid}/task/${id}`).get().pipe(
      map((taskDocSnap) => taskDocSnap.data() as Task)
    );
  }

  updateTimesOfDayOrder(dir: number, is: string, was: string): Observable<{[key: string]: string}> {
    return this.fns.httpsCallable('setTimesOfDayOrder')({dir, is, was});
  }

}
