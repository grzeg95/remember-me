import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../../../shared.module';
import {
  RoundDialogConfirmDeleteComponent
} from './round-edit/round-dialog-confirm-delete/round-dialog-confirm-delete.component';
import {RoundEditComponent} from './round-edit/round-edit.component';
import {RoundNavComponent} from './round/round-nav/round-nav.component';
import {RoundComponent} from './round/round.component';
import {
  TaskDialogConfirmDeleteComponent
} from './round/tasks/task/task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskComponent} from './round/tasks/task/task.component';
import {TaskService} from './round/tasks/task/task.service';
import {TasksComponent} from './round/tasks/tasks-list/tasks.component';
import {TimesOfDayOrderComponent} from './round/tasks/times-of-day-order/times-of-day-order.component';
import {TodayComponent} from './round/tasks/today/today.component';
import {RoundsListComponent} from './rounds-list/rounds-list.component';
import {RoundsRoutingModule} from './rounds-routing.module';
import {RoundsComponent} from './rounds.component';
import {RoundsService} from './rounds.service';

@NgModule({
  declarations: [
    RoundsComponent,
    TasksComponent,
    TaskComponent,
    TodayComponent,
    TimesOfDayOrderComponent,
    TaskDialogConfirmDeleteComponent,
    RoundNavComponent,
    RoundsListComponent,
    RoundComponent,
    RoundEditComponent,
    RoundDialogConfirmDeleteComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    RoundsRoutingModule
  ],
  providers: [
    RoundsService,
    TaskService
  ]
})
export class RoundsModule {
}
