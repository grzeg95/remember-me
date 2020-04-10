import {Injectable} from '@angular/core';
import {AngularFirestore, QuerySnapshot} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {AuthService} from '../auth/auth.service';
import {IUser} from '../auth/i-user';
import {ITask, ITasksListItem, ITimeOfDay, ITodayItem} from './models';
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

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
      .collection<ITimeOfDay>('timesOfDay', (ref) => ref.orderBy('position', 'asc'))
      .get().pipe(tap((querySnapDocData) => console.log(querySnapDocData)), map((querySnapDocData) =>
        querySnapDocData.docs.map((queryDocSnapDocData) =>
          queryDocSnapDocData.data().name
        )
      ));
  }

  getTaskList$(): Observable<ITasksListItem[]> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .get().pipe(tap((querySnapDocData) => console.log(querySnapDocData)), map((querySnapDocData) =>
          querySnapDocData.docs.map((queryDocSnapDocData) => {

            const task = queryDocSnapDocData.data() as ITask;
            const daysOfTheWeek: string[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
              .filter((dayOfTheWeek) => task.daysOfTheWeek[dayOfTheWeek]);

            return {
              description: task.description,
              timesOfDay: Object.keys(task.timesOfDay),
              daysOfTheWeek: daysOfTheWeek.length === 7 ? 'Every day' : daysOfTheWeek.join(', '),
              id: queryDocSnapDocData.id
            } as ITasksListItem;

          })

      ));
  }

  getTodayTasks$(todayName: string): Observable<{ [timeOfDay: string]: ITodayItem[] }> {

    return this.afs.doc(`users/${this.authService.userData.uid}/today/${todayName}`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .get().pipe(map<QuerySnapshot<firebase.firestore.DocumentData>, { [timeOfDay: string]: ITodayItem[] }>((querySnapDocData) => {

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

  getTaskById$(id: string): Observable<DocumentSnapshot> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task').doc<ITask>(id).get().pipe(tap((querySnapDocData) =>
        console.log(querySnapDocData)
      ));
  }

}
