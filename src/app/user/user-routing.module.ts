import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuardUserService} from '../auth/auth.guard.user.service';
import {TaskEditorComponent} from './task-editor/task-editor.component';
import {TasksListComponent} from './tasks-list/tasks-list.component';
import {TodayComponent} from './today/today.component';
import {UserComponent} from './user.component';

const userRoutes: Routes = [
  { path: '',  canActivate: [AuthGuardUserService], canActivateChild: [AuthGuardUserService], component: UserComponent, children: [
      { path: 'today', component: TodayComponent},
      { path: 'tasks-list', component: TasksListComponent },
      { path: 'task-editor/:id', component: TaskEditorComponent },
      { path: 'task-editor', component: TaskEditorComponent }
    ] }
];

@NgModule({
  imports: [ RouterModule.forChild(userRoutes) ],
  exports: [ RouterModule ]
})

export class UserRoutingModule {}
