import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {Subscription} from 'rxjs';
import {ConnectionService} from 'services';
import '../../../../../../../../global.prototype';
import {RouterDict} from '../../../../../../app.constants';
import {Round} from '../../../../../models';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit, OnDestroy {

  isOnline = toSignal(this.connectionService.isOnline$);
  tasks = toSignal(this.roundsService.tasks$);

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns = signal(['description', 'daysOfTheWeek', 'timesOfDays', 'edit']);

  selectedRoundSub: Subscription;
  selectedRound = signal<Round>(null);

  tasksListViewFirstLoading = toSignal(this.roundsService.tasksListViewFirstLoading$);

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
      this.selectedRound.set(round);
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
    this.selectedRoundSub.unsubscribe();
  }
}
