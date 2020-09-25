import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import '../../../../global.prototype';
import {AppService} from '../../app-service';
import {RouterDict} from '../../app.constants';
import {TasksListItem, TimeOfDay} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, OnDestroy {

  get timesOfDayOrderFirstLoading$(): Observable<boolean> {
    return this.userService.timesOfDayOrderFirstLoading$;
  }

  get tasksFirstLoading$(): Observable<boolean> {
    return this.userService.tasksFirstLoading$;
  }

  get timesOfDayOrder$(): Observable<TimeOfDay[]> {
    return this.userService.timesOfDayOrder$;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  RouterDict = RouterDict;
  faEdit = faEdit;
  tasksView$: BehaviorSubject<TasksListItem[]> = new BehaviorSubject([]);
  tasksViewSub: Subscription = new Subscription();

  constructor(private userService: UserService,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.userService.runTasks();

    this.tasksViewSub.add(this.userService.tasks$.subscribe(() => this.updateTasksViews()));
    this.tasksViewSub.add(this.userService.timesOfDayOrder$.subscribe(() => this.updateTasksViews()));
  }

  ngOnDestroy(): void {
    this.tasksViewSub.unsubscribe();
  }

  updateTasksViews(): void {

    const tasks = this.userService.tasks$.getValue();
    const timesOfDayOrder = this.userService.timesOfDayOrder$.getValue().map((val) => val.id);

    const timesOfDayOrderSet = timesOfDayOrder.toSet();
    this.tasksView$.next(tasks.map((taskListItem) => {

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
    }));
  }

  getTimesOfDay(timesOfDay: string[]): string[] {
    return timesOfDay.map((timeOfDay) => timeOfDay.decodeFirebaseSpecialCharacters());
  }

}
