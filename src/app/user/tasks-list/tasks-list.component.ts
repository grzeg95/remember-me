import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
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

  isEmpty = true;
  timesOfDayOrder$: Subscription;
  taskList$: Subscription;
  isConnected$: Subscription;

  constructor(public userService: UserService,
              private appService: AppService) {
    if (userService.taskListItems.length > 0) {
      this.isEmpty = false;
    }
  }

  refreshTimesOfDayOrder(): void {

    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder: string[]) => {
      this.order = timesOfDayOrder;
      this.timesOfDayOrder$.unsubscribe();
    });
  }

  refreshTaskList(): void {

    if (this.taskList$ && !this.taskList$.closed) {
      this.taskList$.unsubscribe();
    }

    this.taskList$ = this.userService.getTaskList$().pipe(map((tasksItemsReceived) => {
      return tasksItemsReceived.map((tasksItemReceived) => {

        if (this.order.length === 0) {
          tasksItemReceived.timesOfDay = Object.keys(tasksItemReceived.timesOfDay).join(', ');
        } else {
          tasksItemReceived.timesOfDay = this.order
            .filter((timeOfDay) => tasksItemReceived.timesOfDay.includes(timeOfDay))
            .join(', ');
        }

        return tasksItemReceived;

      });
    })).subscribe((tasksItemsReceived) => {
      this.taskListItems = tasksItemsReceived;
      this.isEmpty = tasksItemsReceived.length === 0;
      this.taskListItemsFirstLoading = false;
    });
  }

  ngOnInit(): void {
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        console.log(isConnected);
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

}
