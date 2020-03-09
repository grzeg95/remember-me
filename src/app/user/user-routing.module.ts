import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuardUserService} from '../auth/auth.guard.user.service';
import {TaskEditorComponent} from './task-editor/task-editor.component';
import {TasksListComponent} from './tasks-list/tasks-list.component';
import {TodayOrderComponent} from './today-order/today-order.component';
import {TodayComponent} from './today/today.component';
import {UserComponent} from './user.component';

const userRoutes: Routes = [
  { path: '',  canActivate: [AuthGuardUserService], canActivateChild: [AuthGuardUserService], component: UserComponent, children: [
      { path: 'today', component: TodayComponent},
      { path: 'tasks-list', component: TasksListComponent },
      { path: 'task-editor/:id', component: TaskEditorComponent },
      { path: 'task-editor', component: TaskEditorComponent },
      { path: 'today-order', component: TodayOrderComponent }
    ] }
];

@NgModule({
  imports: [ RouterModule.forChild(userRoutes) ],
  exports: [ RouterModule ]
})

export class UserRoutingModule {}
