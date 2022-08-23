import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {RouterDict} from '../../../app.constants';
import {RoundEditComponent} from './round-edit/round-edit.component';
import {RoundComponent} from './round/round.component';
import {TaskComponent} from './round/tasks/task/task.component';
import {TasksComponent} from './round/tasks/tasks-list/tasks.component';
import {TimesOfDayOrderComponent} from './round/tasks/times-of-day-order/times-of-day-order.component';
import {TodayComponent} from './round/tasks/today/today.component';
import {RoundsListComponent} from './rounds-list/rounds-list.component';
import {RoundsComponent} from './rounds.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    redirectTo: RouterDict.roundsList
  },
  {
    path: '',
    component: RoundsComponent,
    children: [
      {
        path: RouterDict.roundsList,
        component: RoundsListComponent
      },
      {
        path: RouterDict.roundEditor,
        component: RoundEditComponent
      },
      {
        path: RouterDict.roundEditor + '/:id',
        component: RoundEditComponent
      },
      {
        path: ':id',
        component: RoundComponent,
        children: [
          {path: RouterDict.todayTasks, component: TodayComponent},
          {path: RouterDict.tasksList, component: TasksComponent},
          {path: RouterDict.taskEditor + '/:id', component: TaskComponent},
          {path: RouterDict.taskEditor, component: TaskComponent},
          {path: RouterDict.timesOfDayOrder, component: TimesOfDayOrderComponent}
        ]
      }
    ]
  },
  {path: '**', redirectTo: RouterDict.roundsList}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RoundsRoutingModule {
}
