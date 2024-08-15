import {Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {RoundEditComponent} from '../components/round-edit/round-edit.component';
import {RoundComponent} from '../components/round/round.component';
import {RoundsListComponent} from '../components/rounds-list/rounds-list.component';
import {RoundsComponent} from '../components/rounds/rounds.component';
import {TaskComponent} from '../components/task/task.component';
import {TasksListComponent} from '../components/tasks-list/tasks-list.component';
import {TimesOfDayOrderComponent} from '../components/times-of-day-order/times-of-day-order.component';
import {TodayComponent} from '../components/today/today.component';
import {RoundsService} from '../services/rounds.service';
import {TaskService} from '../services/task.service';

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
