import {NgModule} from '@angular/core';
import {AngularFireAuthGuard, redirectUnauthorizedTo} from '@angular/fire/compat/auth-guard';
import {RouterModule, Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {TaskComponent} from './task/task.component';
import {TasksComponent} from './tasks/tasks.component';
import {TimesOfDayOrderComponent} from './times-of-day-order/times-of-day-order.component';
import {TodayComponent} from './today/today.component';
import {UserComponent} from './user.component';

const redirectUnauthorizedToGuestEnterView = () => redirectUnauthorizedTo(['/']);

const userRoutes: Routes = [
  {
    path: '',
    canActivate: [AngularFireAuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToGuestEnterView },
    component: UserComponent,
    children: [
      {path: RouterDict.today, component: TodayComponent},
      {path: RouterDict.tasks, component: TasksComponent},
      {path: RouterDict.task + '/:id', component: TaskComponent},
      {path: RouterDict.task, component: TaskComponent},
      {path: RouterDict.timesOfDayOrder, component: TimesOfDayOrderComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(userRoutes)],
  exports: [RouterModule]
})

export class UserRoutingModule {
}
