import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {Round} from 'functions/src/helpers/models';
import {Subscription} from 'rxjs';
import {ConnectionService} from 'services';
import {TasksListItem} from 'src/app/user/models';
import '../../../../../../../../global.prototype';
import {RouterDict} from '../../../../../../app.constants';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, OnDestroy {

  isOnline: boolean;
  isOnlineSub: Subscription;

  tasks: TasksListItem[];
  tasksSub: Subscription;

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  selectedRoundSub: Subscription;
  selectedRound: Round;

  tasksListViewFirstLoading$ = this.roundsService.tasksListViewFirstLoading$;

  constructor(
    private roundsService: RoundsService,
    private connectionService: ConnectionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.selectedRoundSub = this.roundsService.selectedRound$.subscribe((round) => {
      this.roundsService.runTasksList(round);
      this.selectedRound = round;
    });

    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
    this.tasksSub = this.roundsService.tasks$.subscribe((tasks) => this.tasks = tasks);
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
    this.selectedRoundSub.unsubscribe();
    this.isOnlineSub.unsubscribe();
    this.tasksSub.unsubscribe();
  }
}
