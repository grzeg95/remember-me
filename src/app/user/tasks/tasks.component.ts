import {Component, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {AppService} from '../../app-service';
import {RouterDict} from '../../app.constants';
import {TasksListItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.sass'],
  host: {class: 'app'}
})
export class TasksComponent implements OnInit {

  RouterDict = RouterDict;
  faEdit = faEdit;

  get timesOfDayOrder(): string[] {
    return this.userService.timesOfDayOrder;
  }

  get tasks(): TasksListItem[] {
    return this.userService.tasks.map((taskListItem) => {
      taskListItem.timesOfDay = this.timesOfDayOrder
        .filter((timeOfDay) => taskListItem.timesOfDay.includes(timeOfDay));
      return taskListItem;
    });
  }

  get tasksFirstLoading(): boolean {
    return this.userService.tasksFirstLoading;
  }

  get timesOfDayOrderFirstLoading(): boolean {
    return this.userService.timesOfDayOrderFirstLoading;
  }

  get isEmpty(): boolean {
    return this.tasks.length === 0 || this.timesOfDayOrder.length === 0;
  }

  constructor(private userService: UserService,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.userService.runTasks();
  }

  get isConnected(): boolean {
    return this.appService.isConnected$.getValue();
  }

}
