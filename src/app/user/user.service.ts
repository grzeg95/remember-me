import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {Task, TasksListItem, TimeOfDay, TodayItem} from './models';
import User = firebase.User;

@Injectable()
export class UserService {

  get todayFirstLoading(): boolean {
    return this._todayFirstLoading;
  }

  get tasksFirstLoading(): boolean {
    return this._tasksFirstLoading;
  }

  get timesOfDayOrderFirstLoading(): boolean {
    return this._timesOfDayOrderFirstLoading;
  }

  get today(): { [p: string]: TodayItem[] } {
    return this._today;
  }

  get tasks(): TasksListItem[] {
    return this._tasks;
  }

  get timesOfDayOrder(): string[] {
    return this._timesOfDayOrder;
  }

  get todayName(): string {
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][this._now.getDay()];
  }

  get now(): Date {
    return this._now;
  }

  private _todayFirstLoading = true;
  private _tasksFirstLoading = true;
  private _timesOfDayOrderFirstLoading = true;

  private _today: { [timeOfDay: string]: TodayItem[] } = {};
  private _now: Date = new Date();
  private _lastTodayName = '.';
  private _tasks: TasksListItem[] = [];
  private _timesOfDayOrder: string[] = [];

  private today$: Subscription;
  private tasks$: Subscription;
  private timesOfDayOrder$: Subscription;

  clearCache(): void {
    this._today = {};
    this._tasks = [];
    this._timesOfDayOrder = [];
    this._todayFirstLoading = true;
    this._tasksFirstLoading = true;
    this._timesOfDayOrderFirstLoading = true;

    if (this.today$ && !this.today$.closed) {
      this.today$.unsubscribe();
    }

    if (this.tasks$ && !this.tasks$.closed) {
      this.tasks$.unsubscribe();
    }

    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService,
              private appService: AppService) {
    this.appService.isConnected$.subscribe((isConnected) => {
      if (!isConnected) {
        this._tasksFirstLoading = true;
        this._todayFirstLoading = true;
        this._timesOfDayOrderFirstLoading = true;
      }
    });
  }

  runToday(): void {
    this._now = new Date();

    if (this._lastTodayName !== this.todayName && this.today$ && !this.today$.closed) {
      this.today$.unsubscribe();
    }
    this._lastTodayName = this.todayName;

    if (this.today$ && !this.today$.closed) {
      return;
    }

    this.today$ = this.afs.doc(`users/${this.authService.userData.uid}/today/${this.todayName}`)
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
          this._today = today;
          this._todayFirstLoading = false;
        }
      });
  }

  runTasks(): void {
    if (this.tasks$ && !this.tasks$.closed) {
      return;
    }

    this.tasks$ = this.afs.doc<User>(`users/${this.authService.userData.uid}/`)
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
          this._tasks = tasks;
          this._tasksFirstLoading = false;
        }
      });
  }

  runTimesOfDayOrder(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      return;
    }

    this.timesOfDayOrder$ = this.afs
      .doc<User>(`users/${this.authService.userData.uid}`)
      .collection<TimeOfDay>('timesOfDay', (ref) => ref.orderBy('position', 'asc').limit(20))
      .snapshotChanges().pipe(
        map((querySnapDocData) => querySnapDocData.map((queryDocSnapDocData) => queryDocSnapDocData.payload.doc.id))
      ).subscribe((timesOfDay) => {
        if (timesOfDay) {
          this._timesOfDayOrder = timesOfDay;
          this._timesOfDayOrderFirstLoading = false;
        }
      });
  }

  getTaskById$(id: string): Observable<Task> {
    return this.afs.doc<User>(`users/${this.authService.userData.uid}/task/${id}`).get().pipe(
      map((taskDocSnap) => taskDocSnap.data() as Task)
    );
  }

}
