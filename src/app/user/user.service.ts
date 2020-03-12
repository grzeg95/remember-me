import {Injectable} from '@angular/core';
import {ITodayItem} from './models';
import {TasksListItem} from './tasks-list/tasks-list.item';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;
  todayOrderFirstLoading = true;

  todayItems: {[timeOfDay: string]: ITodayItem[]} = {};
  taskListItems: TasksListItem[] = [];
  timesOfDayOrder: string[] = [];

  clearCache(): void {
    this.todayItems = {};
    this.taskListItems = [];
    this.timesOfDayOrder = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
    this.todayOrderFirstLoading = true;
  }

  prepareSort(timesOfDay: { [name: string]: { position: number; counter: number; }}): void {

    const orderTMP: {
      timeOfDay: string,
      position: number;
    }[] = [];

    Object.keys(timesOfDay).forEach((timeOfDay) => {
      orderTMP.push({
        timeOfDay,
        position: timesOfDay[timeOfDay].position
      });
    });

    this.timesOfDayOrder = orderTMP.sort((a, b) => {
      return a.position - b.position;
    }).map((a) => a.timeOfDay);

  }

}
