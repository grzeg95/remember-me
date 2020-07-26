import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {Task, TasksListItem, TimeOfDay, TodayItem} from './models';
import User = firebase.User;

@Injectable()
export class UserService {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this._setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this._setTimesOfDayOrderSub;
  }

  get todayFirstLoading$(): Observable<boolean> {
    return this.todayFirstLoading.asObservable();
  }

  get tasksFirstLoading$(): Observable<boolean> {
    return this.tasksFirstLoading.asObservable();
  }

  get timesOfDayOrderFirstLoading$(): Observable<boolean> {
    return this.timesOfDayOrderFirstLoading.asObservable();
  }

  get today$(): Observable<{ [p: string]: TodayItem[] }> {
    return this.today.asObservable();
  }

  get tasks$(): Observable<TasksListItem[]> {
    return this.tasks.asObservable();
  }

  get timesOfDayOrder$(): Observable<string[]> {
    return this.timesOfDayOrder.asObservable();
  }

  get todayFullName$(): Observable<string> {
    return this.todayFullName.asObservable();
  }

  get now$(): Observable<Date> {
    return this.now.asObservable();
  }

  private _setTimesOfDayOrderSub: Subscription;
  private _lastTodayName = '.';

  todayFirstLoading = new BehaviorSubject<boolean>(true);
  tasksFirstLoading = new BehaviorSubject<boolean>(true);
  timesOfDayOrderFirstLoading = new BehaviorSubject<boolean>(true);

  today = new BehaviorSubject<{[p: string]: TodayItem[]}>({});
  now = new BehaviorSubject<Date>(new Date());
  tasks = new BehaviorSubject<TasksListItem[]> ([]);
  timesOfDayOrder = new BehaviorSubject<string[]>([]);
  todayName = new BehaviorSubject<string>('');
  todayFullName = new BehaviorSubject<string>('');

  private todaySub: Subscription;
  private tasksSub: Subscription;
  private timesOfDayOrderSub: Subscription;

  clearCache(): void {
    this.today.next({});
    this.tasks.next([]);
    this.timesOfDayOrder.next([]);
    this.todayFirstLoading.next(true);
    this.tasksFirstLoading.next(true);
    this.timesOfDayOrderFirstLoading.next(true);

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
              private appService: AppService) {
    this.appService.isConnected$.subscribe((isConnected) => {
      if (!isConnected) {
        this.tasksFirstLoading.next(true);
        this.todayFirstLoading.next(true);
        this.timesOfDayOrderFirstLoading.next(true);
        if (this._setTimesOfDayOrderSub && !this._setTimesOfDayOrderSub.closed) {
          this._setTimesOfDayOrderSub.unsubscribe();
        }
      }
    });

    this.now$.subscribe((now) => {
      this.todayFullName.next(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      this.todayName.next(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    });
  }

  runToday(): void {
    this.now.next(new Date());

    if (this._lastTodayName !== this.todayName.getValue() && this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }
    this._lastTodayName = this.todayName.getValue();

    if (this.todaySub && !this.todaySub.closed) {
      return;
    }

    this.todaySub = this.afs.doc(`users/${this.authService.userData.uid}/today/${this.todayName.getValue()}`)
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
          this.today.next(today);
          this.todayFirstLoading.next(false);
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
          this.tasks.next(tasks);
          this.tasksFirstLoading.next(false);
        }
      });
  }

  runTimesOfDayOrder(): void {
    if (this.timesOfDayOrderSub && !this.timesOfDayOrderSub.closed) {
      return;
    }

    this.timesOfDayOrderSub = this.afs
      .doc<User>(`users/${this.authService.userData.uid}`)
      .collection<TimeOfDay>('timesOfDay', (ref) => ref.orderBy('position', 'asc').limit(20))
      .snapshotChanges()
      .pipe(map((querySnapDocData) => querySnapDocData.map((queryDocSnapDocData) => queryDocSnapDocData.payload.doc.id)))
      .subscribe((timesOfDay) => {
        if (timesOfDay) {
          this.timesOfDayOrder.next(timesOfDay);
          this.timesOfDayOrderFirstLoading.next(false);
        }
      });
  }

  getTaskById$(id: string): Observable<Task> {
    return this.afs.doc<User>(`users/${this.authService.userData.uid}/task/${id}`).get().pipe(
      map((taskDocSnap) => taskDocSnap.data() as Task));
  }

}
