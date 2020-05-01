import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {AuthGuardUserService} from '../auth/auth.guard.user.service';
import {TaskEditorComponent} from './task-editor/task-editor.component';
import {TasksListComponent} from './tasks-list/tasks-list.component';
import {TodayOrderComponent} from './today-order/today-order.component';
import {TodayComponent} from './today/today.component';
import {UserComponent} from './user.component';

const userRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuardUserService],
    canActivateChild: [AuthGuardUserService],
    component: UserComponent,
    children: [
      {path: RouterDict['today'], component: TodayComponent},
      {path: RouterDict['tasks-list'], component: TasksListComponent},
      {path: RouterDict['task-editor'] + '/:id', component: TaskEditorComponent},
      {path: RouterDict['task-editor'], component: TaskEditorComponent},
      {path: RouterDict['today-order'], component: TodayOrderComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(userRoutes)],
  exports: [RouterModule]
})

export class UserRoutingModule {
}
