import {Injectable} from '@angular/core';
import {ITodayItem} from './models';
import {TasksListItem} from './tasks-list/tasks-list.item';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;

  todayItems: {timeOfDay: string, position: number, task: ITodayItem[], done: boolean}[] = [];
  taskListItems: TasksListItem[] = [];
  timesOfDayOrder: string[] = [];

  clearCache(): void {
    this.todayItems = [];
    this.taskListItems = [];
    this.timesOfDayOrder = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
  }

}
