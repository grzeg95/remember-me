import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {Subscription} from 'rxjs';
import '../../../../../../../../global.prototype';
import {AppService} from '../../../../../../app-service';
import {RouterDict} from '../../../../../../app.constants';
import {RoundService} from '../../round.service';
import {ActivatedRoute, Router} from '@angular/router';
import {RoundsService} from '../../../rounds.service';
import { Round } from 'firebase-functions/src/helpers/models';
import { TasksListItem } from 'src/app/user/models';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, OnDestroy {

  isOnline: boolean;
  isOnlineSub: Subscription;

  tasksFirstLoading: boolean;
  tasksFirstLoadingSub: Subscription;

  roundsOrderFirstLoading: boolean;
  roundsOrderFirstLoadingSub: Subscription;

  tasks: TasksListItem[];
  tasksSub: Subscription;

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  roundSelectedSub: Subscription;
  roundSelected: Round;

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
      this.roundSelected = round;
    });

    this.isOnlineSub = this.appService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
    this.tasksFirstLoadingSub = this.roundsService.tasksFirstLoading$.subscribe((tasksFirstLoading) => this.tasksFirstLoading = tasksFirstLoading);
    this.roundsOrderFirstLoadingSub = this.roundsService.roundsOrderFirstLoading$.subscribe((roundsOrderFirstLoading) => this.roundsOrderFirstLoading = roundsOrderFirstLoading);
    this.tasksSub = this.roundService.tasks$.subscribe((tasks) => this.tasks = tasks);
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
    this.isOnlineSub.unsubscribe();
    this.tasksFirstLoadingSub.unsubscribe();
    this.roundsOrderFirstLoadingSub.unsubscribe();
    this.tasksSub.unsubscribe();
  }
}
