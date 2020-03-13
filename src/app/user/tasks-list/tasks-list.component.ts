import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {ITask, ITasksListItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-tasks-list',
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.sass'],
  host: { class: 'app' }
})
export class TasksListComponent implements OnInit, OnDestroy {

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

      const tasksItemsReceived: ITasksListItem[] = [];

      changes.forEach((change) => {

        const task = change.payload.doc.data() as ITask;
        const id = change.payload.doc.id;
        const timesOfDay = Object.keys(task.timesOfDay).join(', ');
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

    if (this.tasksSub && !this.tasksSub.closed) {
      this.tasksSub.unsubscribe();
    }

  }

  descriptionOrder = (a: ITasksListItem, b: ITasksListItem): number => a.description.localeCompare(b.description);

}
