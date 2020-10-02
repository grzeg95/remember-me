import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {TaskDialogConfirmDeleteComponent} from './task/task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskComponent} from './task/task.component';
import {TasksComponent} from './tasks/tasks.component';
import {TimesOfDayOrderComponent} from './times-of-day-order/times-of-day-order.component';
import {TodayComponent} from './today/today.component';
import {UserNavComponent} from './user-nav/user-nav.component';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {UserService} from './user.service';

@NgModule({
  declarations: [
    UserComponent,
    TasksComponent,
    TaskComponent,
    TodayComponent,
    UserNavComponent,
    TimesOfDayOrderComponent,
    TaskDialogConfirmDeleteComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    UserRoutingModule
  ],
  providers: [
    UserService
  ],
  entryComponents: [
    TaskDialogConfirmDeleteComponent
  ]
})
export class UserModule {
}
