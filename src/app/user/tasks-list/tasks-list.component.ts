import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {IUser} from '../../auth/i-user';
import {ITask, ITasksListItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-tasks-list',
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.sass'],
  host: { class: 'app' }
})
export class TasksListComponent implements OnInit, OnDestroy {

  get order(): string[] {
    return this.userService.timesOfDayOrder;
  }

  set order(newOrder: string[]) {
    this.userService.timesOfDayOrder = newOrder;
  }

  get taskListItems(): ITasksListItem[] {
    return this.userService.taskListItems.sort(this.descriptionOrder);
  }

  set taskListItems(newTaskListItems: ITasksListItem[]) {
    this.userService.taskListItems = newTaskListItems;
  }

  get taskListItemsFirstLoading(): boolean {
    return this.userService.taskListItemsFirstLoading;
  }

  set taskListItemsFirstLoading(value: boolean) {
    this.userService.taskListItemsFirstLoading = value;
  }

  tasksCollection: AngularFirestoreCollection<ITask>;
  tasksSub: Subscription;
  isEmpty = true;
  userSubscription: Subscription = new Subscription();

  constructor(private authService: AuthService,
              public userService: UserService,
              private afs: AngularFirestore) {
    if (userService.taskListItems.length > 0) {
      this.isEmpty = false;
    }
  }

  ngOnInit(): void {

    this.userSubscription = this.userService.user$.subscribe((user: IUser) => {
      if (user.timesOfDay) {
        this.userService.prepareSort(user.timesOfDay);
      }
    });

    this.tasksCollection = this.afs.doc(`users/${this.authService.userData.uid}/`).collection('task');

    this.tasksSub = this.tasksCollection.snapshotChanges().pipe(map((changes) => {

      const tasksItemsReceived: ITasksListItem[] = [];

      changes.forEach((change) => {

        const task = change.payload.doc.data() as ITask;
        const id = change.payload.doc.id;
        const timesOfDay = Object.keys(task.timesOfDay);
        const description = task.description;
        let daysOfTheWeek: any = [];

        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((dayOfTheWeek) => {
          if (typeof task.daysOfTheWeek[dayOfTheWeek] === 'boolean' && task.daysOfTheWeek[dayOfTheWeek]) {
            daysOfTheWeek.push(dayOfTheWeek);
          }
        });

        if (daysOfTheWeek.length === 7) {
          daysOfTheWeek = 'Every day';
        } else {
          daysOfTheWeek = daysOfTheWeek.join(', ');
        }

        const taskItem: ITasksListItem = {
          description,
          timesOfDay,
          daysOfTheWeek,
          id
        };

        tasksItemsReceived.push(taskItem);
      });

      return tasksItemsReceived;

    })).subscribe((tasksItemsReceived) => {
      this.taskListItems = tasksItemsReceived;
      this.isEmpty = tasksItemsReceived.length === 0;
      this.taskListItemsFirstLoading = false;
    });

  }

  ngOnDestroy(): void  {
    this.tasksSub.unsubscribe();
    this.userSubscription.unsubscribe();
  }

  sortTimesOfDay(timesOfDay: string[]): string {
    const timesOfDayOrder = [];
    this.order.forEach((timeOfDay) => {
      if (timesOfDay.includes(timeOfDay)) {
        timesOfDayOrder.push(timeOfDay);
      }
    });
    return timesOfDayOrder.length > 0 ? timesOfDayOrder.join(', ') : '';
  }

  descriptionOrder = (a: ITasksListItem, b: ITasksListItem): number => a.description.localeCompare(b.description);

}
