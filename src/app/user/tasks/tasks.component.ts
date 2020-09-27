import {Component, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {BehaviorSubject, Observable} from 'rxjs';
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
export class TasksComponent implements OnInit {

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

  get tasks$(): BehaviorSubject<TasksListItem[]> {
    return this.userService.tasks$;
  }

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  constructor(private userService: UserService,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.userService.runTasks();
  }

  getTimesOfDay(timesOfDayOrder: TimeOfDay[], taskTimesOfDay: string[]): string[] {
    const taskTimesOfDaySet = taskTimesOfDay.toSet();
    return timesOfDayOrder.filter((timeOfDayOrderItem) => taskTimesOfDaySet.has(timeOfDayOrderItem.id))
      .map((timeOfDayOrderItem) => timeOfDayOrderItem.id.decodeFirebaseSpecialCharacters());
  }

}
