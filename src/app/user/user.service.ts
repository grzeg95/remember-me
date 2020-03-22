import {Injectable} from '@angular/core';
import {
  Action,
  AngularFirestore,
  DocumentSnapshot
} from '@angular/fire/firestore';
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

  getTaskList$(): Observable<ITasksListItem[]> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .snapshotChanges().pipe(map((docChangeAction) => {

      const tasksItemsReceived: ITasksListItem[] = [];

      docChangeAction.forEach((docChangeActionDoc) => {

        const task = docChangeActionDoc.payload.doc.data() as ITask;
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
          id: docChangeActionDoc.payload.doc.id
        };

        tasksItemsReceived.push(taskItem);
      });

      return tasksItemsReceived;

    }));
  }

  getTodayTasks$(todayName: string): Observable<{ [p: string]: ITodayItem[] }> {
    return this.afs.doc(`users/${this.authService.userData.uid}/today/${todayName}`)
      .collection<ITask>('task', (ref) => ref.orderBy('description', 'asc'))
      .snapshotChanges().pipe(
        map((docChangeActionDocDataArray) => {

          const todayTasksByTimeOfDay: {[timeOfDay: string]: ITodayItem[]} = {};

          docChangeActionDocDataArray.forEach((docChangeActionDocData) => {

            const task: ITask = docChangeActionDocData.payload.doc.data();
            const id: string = docChangeActionDocData.payload.doc.id;

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

  getTaskById$(id: string): Observable<Action<DocumentSnapshot<ITask>>> {
    return this.afs.doc<IUser>(`users/${this.authService.userData.uid}/`)
      .collection<ITask>('task').doc<ITask>(id).snapshotChanges();
  }

  getTimesOfDayOrder$(): Observable<string[]> {
    return this.afs
      .doc<IUser>(`users/${this.authService.userData.uid}`)
      .collection<ITimeOfDay>('timesOfDay', (ref) => ref.orderBy('position'))
      .snapshotChanges().pipe(map((docChangeAction) => {

        const timesOfDayNames: string[] = [];

        docChangeAction.forEach((docChangeActionDoc) =>
          timesOfDayNames.push(docChangeActionDoc.payload.doc.data().name)
        );

        return timesOfDayNames;

      }));
  }

}
