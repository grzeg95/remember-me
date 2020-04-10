import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {AppService} from '../../app-service';
import {ITasksListItem} from '../models';
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
    return this.userService.taskListItems.map((taskListItem) => {
      taskListItem.timesOfDay = this.order
        .filter((timeOfDay) => taskListItem.timesOfDay.includes(timeOfDay))
        .join(', ');
      return taskListItem;
    });
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

  get isEmpty(): boolean {
    return this.taskListItems.length === 0 || this.order.length === 0;
  }

  timesOfDayOrder$: Subscription;
  taskList$: Subscription;
  isConnected$: Subscription;

  constructor(private userService: UserService,
              private appService: AppService) {}

  ngOnInit(): void {
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTimesOfDayOrder();
        this.refreshTaskList();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    if (this.taskList$ && !this.taskList$.closed) {
      this.taskList$.unsubscribe();
    }

    this.isConnected$.unsubscribe();
  }

  refreshTimesOfDayOrder(): void {

    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$()
      .subscribe((timesOfDayOrder: string[]) => this.order = timesOfDayOrder);
  }

  refreshTaskList(): void {

    if (this.taskList$ && !this.taskList$.closed) {
      this.taskList$.unsubscribe();
    }

    this.taskList$ = this.userService.getTaskList$().subscribe((tasksItemsReceived) => {
      this.taskListItems = tasksItemsReceived;
      this.taskListItemsFirstLoading = false;
    });
  }

}
