import {NgModule} from '@angular/core';
import {RoundDialogConfirmDeleteComponent} from './round-edit/round-dialog-confirm-delete/round-dialog-confirm-delete.component';
import {RoundEditComponent} from './round-edit/round-edit.component';
import {TasksComponent} from './round/tasks/tasks-list/tasks.component';
import {TaskComponent} from './round/tasks/task/task.component';
import {TodayComponent} from './round/tasks/today/today.component';
import {TimesOfDayOrderComponent} from './round/tasks/times-of-day-order/times-of-day-order.component';
import {
  TaskDialogConfirmDeleteComponent
} from './round/tasks/task/task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../shared.module';
import {RoundsComponent} from './rounds.component';
import {RoundNavComponent} from './round/round-nav/round-nav.component';
import {RoundsRoutingModule} from './rounds-routing.module';
import {RoundsListComponent} from './rounds-list/rounds-list.component';
import {RoundComponent} from './round/round.component';

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
  providers: [],
  entryComponents: [
    TaskDialogConfirmDeleteComponent,
    RoundDialogConfirmDeleteComponent
  ]
})
export class RoundsModule {
}
