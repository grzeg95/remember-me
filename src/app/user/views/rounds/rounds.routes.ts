import {Routes} from '@angular/router';
import {RouterDict} from '../../../app.constants';
import {RoundEditComponent} from './round-edit/round-edit.component';
import {RoundComponent} from './round/round.component';
import {TaskComponent} from './round/task/task.component';
import {TaskService} from './round/task/task.service';
import {TasksListComponent} from './round/tasks-list/tasks-list.component';
import {TodayComponent} from './round/today/today.component';
import {TimesOfDayOrderComponent} from './round/times-of-day-order/times-of-day-order.component';
import {RoundsListComponent} from './rounds-list/rounds-list.component';
import {RoundsComponent} from './rounds.component';
import {RoundsService} from './rounds.service';

export const roundsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: RouterDict.roundsList
  },
  {
    path: '',
    component: RoundsComponent,
    providers: [
      RoundsService,
      TaskService
    ],
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
          {path: RouterDict.tasksList, component: TasksListComponent},
          {path: RouterDict.taskEditor + '/:id', component: TaskComponent},
          {path: RouterDict.taskEditor, component: TaskComponent},
          {path: RouterDict.timesOfDayOrder, component: TimesOfDayOrderComponent}
        ]
      }
    ]
  },
  {path: '**', redirectTo: RouterDict.roundsList}
];
