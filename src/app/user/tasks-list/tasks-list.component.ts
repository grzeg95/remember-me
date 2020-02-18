import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {ITask} from '../models';
import {UserService} from '../user.service';
import {TasksListItem} from './tasks-list.item';

@Component({
  selector: 'app-tasks-list',
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.sass'],
  host: { class: 'app' }
})
export class TasksListComponent implements OnInit, OnDestroy {

  get taskListItems(): TasksListItem[] {
    return this.userService.taskListItems.sort(this.descriptionOrder);
  }

  tasksCollection: AngularFirestoreCollection<ITask>;
  tasksSub: Subscription;

  isEmpty = true;

  get taskListItemsFirstLoading(): boolean {
    return this.userService.taskListItemsFirstLoading;
  }

  set taskListItemsFirstLoading(value: boolean) {
    this.userService.taskListItemsFirstLoading = value;
  }

  constructor(private authService: AuthService,
              public userService: UserService,
              private afs: AngularFirestore) {
    if (userService.taskListItems.length > 0) {
      this.isEmpty = false;
    }
  }

  ngOnInit(): void {

    this.tasksCollection = this.afs.doc(`users/${this.authService.userData.uid}/`).collection('task');

    this.tasksSub = this.tasksCollection.snapshotChanges().pipe(map((changes) => {

      const tasksItemsReceived: TasksListItem[] = [];

      changes.forEach((change) => {

        const task = change.payload.doc.data() as ITask;
        const taskItem = new TasksListItem();

        taskItem.description = task.description;
        taskItem.setDaysOfTheWeek(task.daysOfTheWeek);
        taskItem.setTimesOfDay(task.timesOfDay);
        taskItem.id = change.payload.doc.id;

        tasksItemsReceived.push(taskItem);
      });

      return tasksItemsReceived;

    })).subscribe((tasksItemsReceived) => {
      this.userService.taskListItems = tasksItemsReceived;
      this.isEmpty = tasksItemsReceived.length === 0;
      this.taskListItemsFirstLoading = false;
    });

  }

  ngOnDestroy(): void  {

    if (this.tasksSub && !this.tasksSub.closed) {
      this.tasksSub.unsubscribe();
    }

  }

  descriptionOrder = (a: TasksListItem, b: TasksListItem):
    number => a.description.localeCompare(b.description);

}
