import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {performance} from 'firebase';
import {RouterDict} from '../../app.constants';
import {ITasksListItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.sass'],
  host: {class: 'app'}
})
export class TasksComponent implements OnInit, OnDestroy {

  perf = performance();
  tasksListComponentTrace = this.perf.trace('TasksComponent');
  RouterDict = RouterDict;

  faEdit = faEdit;

  get timesOfDayOrder(): string[] {
    return this.userService.timesOfDayOrder;
  }

  get tasks(): ITasksListItem[] {
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

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.tasksListComponentTrace.start();
    this.userService.runTimesOfDayOrder();
    this.userService.runTasks();
  }

  ngOnDestroy(): void {
    this.tasksListComponentTrace.stop();
  }

}
