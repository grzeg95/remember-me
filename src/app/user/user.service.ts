import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
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
      .collection<ITimeOfDay>('timesOfDay', (ref) => ref.orderBy('position', 'asc'))
      .get().pipe(map((querySnapDocData) =>
        querySnapDocData.docs.map((queryDocSnapDocData) => queryDocSnapDocData.data().name)
      ));
  }

  getTaskList$(): Observable<ITasksListItem[]> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .get().pipe(map((querySnapDocData) =>
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
      .get().pipe(map((querySnapDocData) => {

          const todayTasksByTimeOfDay: { [timeOfDay: string]: ITodayItem[] } = {};

          querySnapDocData.forEach((queryDocSnapDocData) => {

            const task: ITask = queryDocSnapDocData.data() as ITask;

            for (const timeOfDay in task.timesOfDay) {
              if (task.timesOfDay.hasOwnProperty(timeOfDay)) {
                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }
                todayTasksByTimeOfDay[timeOfDay].push({
                  description: task.description,
                  done: task.timesOfDay[timeOfDay],
                  id: queryDocSnapDocData.id
                });
              }
            }

          });

          return todayTasksByTimeOfDay;

        }));
  }

  getTaskById$(id: string): Observable<ITask> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/task/${id}`).get().pipe(
      map((taskDocSnap) => taskDocSnap.data() as ITask)
    );
  }

}
