import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {Observable, Subscription} from 'rxjs';
import '../../../../global.prototype';
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
export class TasksComponent implements OnInit, OnDestroy {

  get timesOfDayOrderFirstLoading$(): Observable<boolean> {
    return this.userService.timesOfDayOrderFirstLoading$;
  }

  get tasksFirstLoading$(): Observable<boolean> {
    return this.userService.tasksFirstLoading$;
  }

  get timesOfDayOrder$(): Observable<string[]> {
    return this.userService.timesOfDayOrder$;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  RouterDict = RouterDict;
  faEdit = faEdit;
  tasksView: TasksListItem[] = [];
  tasksSub: Subscription;
  timesOfDayOrderSub: Subscription;

  constructor(private userService: UserService,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.userService.runTasks();

    this.tasksSub = this.userService.tasks$.subscribe((tasks) => {
      this.updateTasksViews(tasks, this.userService.timesOfDayOrder.getValue());
    });

    this.timesOfDayOrderSub = this.userService.timesOfDayOrder$.subscribe((timesOfDayOrder) => {
      this.updateTasksViews(this.userService.tasks.getValue(), timesOfDayOrder);
    });
  }

  ngOnDestroy(): void {
    this.tasksSub.unsubscribe();
    this.timesOfDayOrderSub.unsubscribe();
  }

  updateTasksViews(tasks: TasksListItem[], timesOfDayOrder: string[]): void {

    const timesOfDayOrderSet = timesOfDayOrder.toSet();
    this.tasksView = tasks.map((taskListItem) => {

      const timesOfDayOrderSetIntersectionTaskListItemTimesOfDay = timesOfDayOrderSet.intersection((taskListItem.timesOfDay as string[]).toSet());
      const timesOfDayOrderTmp = [];

      for (const x of timesOfDayOrder) {
        if (timesOfDayOrderSetIntersectionTaskListItemTimesOfDay.has(x)) {
          timesOfDayOrderTmp.push(x);
          timesOfDayOrderSetIntersectionTaskListItemTimesOfDay.delete(x);
        }
      }

      taskListItem.timesOfDay = timesOfDayOrderTmp;
      return taskListItem;
    });
  }

}
