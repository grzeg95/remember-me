import {NgTemplateOutlet} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTableModule} from '@angular/material/table';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import 'global.prototype';

import { RouterDict } from '../../app.constants';
import {ConnectionService} from '../../services';
import {RoundsService} from '../../services/rounds.service';
@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks-list.component.html',
  imports: [
    MatProgressBarModule,
    MatTableModule,
    MatButtonModule,
    FontAwesomeModule,
    NgTemplateOutlet
  ],
  styleUrls: ['./tasks-list.component.scss']
})
export class TasksListComponent implements OnInit {

  isOnline = this.connectionService.isOnline;
  selectedRound = this.roundsService.selectedRound;
  tasksList = this.roundsService.tasksList;
  tasksListFirstLoading = this.roundsService.tasksListFirstLoading;

  RouterDict = RouterDict;
  faEdit = faEdit;
  displayedColumns: string[] = ['description', 'daysOfTheWeek', 'timesOfDays', 'edit'];

  constructor(
    private roundsService: RoundsService,
    private connectionService: ConnectionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.roundsService.setGettingOfTasksList(this.selectedRound()!);
  }

  getTimesOfDay(timesOfDayOrder: string[], taskTimesOfDay: string[]): string[] {
    const taskTimesOfDaySet = taskTimesOfDay.toSet();
    return timesOfDayOrder.filter((timeOfDayOrderItem) => taskTimesOfDaySet.has(timeOfDayOrderItem));
  }

  goToTask(taskId?: string) {
    if (!taskId) {
      this.router.navigate(['../', this.RouterDict.taskEditor], {relativeTo: this.route})
    } else {
      this.router.navigate(['../', this.RouterDict.taskEditor, taskId], {relativeTo: this.route})
    }
  }
}
