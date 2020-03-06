import {Injectable} from '@angular/core';
import {ITodayTimesOfDay} from './models';
import {TasksListItem} from './tasks-list/tasks-list.item';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;

  todayItems: ITodayTimesOfDay = {};
  taskListItems: TasksListItem[] = [];

  clearCache(): void {
    this.todayItems = {};
    this.taskListItems = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
  }

}
