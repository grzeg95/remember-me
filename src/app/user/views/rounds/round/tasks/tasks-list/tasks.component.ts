import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import '../../../../../../../../global.prototype';
import {AppService} from '../../../../../../app-service';
import {RouterDict} from '../../../../../../app.constants';
import {TasksListItem} from '../../../../../models';
import {RoundService} from '../../round.service';
import {ActivatedRoute, Router} from '@angular/router';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, OnDestroy {

  get roundsOrderFirstLoading$(): Observable<boolean> {
    return this.roundService.roundsOrderFirstLoading$;
  }

  get tasksFirstLoading$(): Observable<boolean> {
    return this.roundService.tasksFirstLoading$;
  }

  get timesOfDay(): string[] {
    return this.roundsService.roundSelected$?.value?.timesOfDay || [];
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get tasks$(): BehaviorSubject<TasksListItem[]> {
    return this.roundService.tasks$;
  }

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  roundSelectedSub: Subscription;

  constructor(
      private roundService: RoundService,
      private roundsService: RoundsService,
      private appService: AppService,
      private router: Router,
      private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.roundSelectedSub = this.roundsService.roundSelected$.subscribe((round) => {
      this.roundService.runTasksList(round);
    });
  }

  getTimesOfDay(timesOfDayOrder: string[], taskTimesOfDay: string[]): string[] {
    const taskTimesOfDaySet = taskTimesOfDay.toSet();
    return timesOfDayOrder.filter((timeOfDayOrderItem) => taskTimesOfDaySet.has(timeOfDayOrderItem));
  }

  goToTask(taskId?: string) {
    if (!taskId) {
      this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route})
    } else {
      this.router.navigate(['../', RouterDict.taskEditor, taskId], {relativeTo: this.route})
    }
  }

  ngOnDestroy(): void {
    this.roundSelectedSub.unsubscribe();
  }
}
