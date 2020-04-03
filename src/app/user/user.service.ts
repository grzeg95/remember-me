import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {AuthService} from '../auth/auth.service';
import {IUser} from '../auth/i-user';
import {ITask, ITasksListItem, ITimeOfDay, ITodayItem} from './models';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;
  todayOrderFirstLoading = true;

  todayItems: {[timeOfDay: string]: ITodayItem[]} = {};
  taskListItems: ITasksListItem[] = [];
  timesOfDayOrder: string[] = [];

  clearCache(): void {
    this.todayItems = {};
    this.taskListItems = [];
    this.timesOfDayOrder = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
    this.todayOrderFirstLoading = true;
  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService) {}

  getTimesOfDayOrder$(): Observable<string[]> {
    return this.afs
      .doc<IUser>(`users/${this.authService.userData.uid}`)
      .collection<ITimeOfDay>('timesOfDay', (ref) => ref.orderBy('position'))
      .get().pipe(map((querySnapDocData) => {

        console.log(querySnapDocData);
        const timesOfDayNames: string[] = [];

        querySnapDocData.forEach((queryDocSnapDocData) =>
          timesOfDayNames.push(queryDocSnapDocData.data().name)
        );

        return timesOfDayNames;

      }));
  }

  getTaskList$(): Observable<ITasksListItem[]> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .get().pipe(map((querySnapDocData) => {

        const tasksItemsReceived: ITasksListItem[] = [];

        console.log(querySnapDocData);

        querySnapDocData.forEach((queryDocSnapDocData) => {

          const task = queryDocSnapDocData.data() as ITask;
          let daysOfTheWeek: any = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            .filter((dayOfTheWeek) => task.daysOfTheWeek[dayOfTheWeek]);

          if (daysOfTheWeek.length === 7) {
            daysOfTheWeek = 'Every day';
          } else {
            daysOfTheWeek = daysOfTheWeek.join(', ');
          }

          const taskItem: ITasksListItem = {
            description: task.description,
            timesOfDay: Object.keys(task.timesOfDay),
            daysOfTheWeek,
            id: queryDocSnapDocData.id
          };

          tasksItemsReceived.push(taskItem);
        });

        return tasksItemsReceived;

      }));
  }

  getTodayTasks$(todayName: string): Observable<{ [p: string]: ITodayItem[] }> {

    return this.afs.doc(`users/${this.authService.userData.uid}/today/${todayName}`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .get().pipe(
        map((querySnapDocData) => {

          const todayTasksByTimeOfDay: { [timeOfDay: string]: ITodayItem[] } = {};

          console.log(querySnapDocData);

          querySnapDocData.forEach((queryDocSnapDocData) => {

            const task: ITask = queryDocSnapDocData.data() as ITask;
            const id: string = queryDocSnapDocData.id;

            for (const timeOfDay in task.timesOfDay) {
              if (task.timesOfDay.hasOwnProperty(timeOfDay)) {
                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }
                todayTasksByTimeOfDay[timeOfDay].push({
                  description: task.description,
                  done: task.timesOfDay[timeOfDay],
                  id
                });
              }
            }

          });

          this.todayItemsFirstLoading = false;
          return todayTasksByTimeOfDay;

        }));
  }

  getTaskById$(id: string): Observable<firebase.firestore.DocumentSnapshot> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task').doc<ITask>(id).get().pipe(tap((querySnapDocData) => {
        console.log(querySnapDocData);
      }));
  }

}
