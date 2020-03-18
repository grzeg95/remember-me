import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
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
    return this.userService.taskListItems;
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
        this.userService.prepareTimesOfDayOrder(user.timesOfDay);
      }
    });

    this.tasksSub = this.afs.doc(`users/${this.authService.userData.uid}/`)
      .collection('task', (ref) => ref.orderBy('description', 'asc'))
      .snapshotChanges()
      .pipe(map((changes) => {

      const tasksItemsReceived: ITasksListItem[] = [];

      changes.forEach((change) => {

        const task = change.payload.doc.data() as ITask;
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
          id: change.payload.doc.id
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

}
