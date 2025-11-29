import {Routes} from '@angular/router';
import {RoundEdit} from '../components/round-edit/round-edit';
import {Round} from '../components/round/round';
import {RoundsList} from '../components/rounds-list/rounds-list';
import {Rounds} from '../components/rounds/rounds';
import {Task} from '../components/task/task';
import {TasksList} from '../components/tasks-list/tasks-list';
import {TimesOfDayOrder} from '../components/times-of-day-order/times-of-day-order';
import {Today} from '../components/today/today';
import {RouterDict} from '../models/router-dict';
import {authGuardUnauthorized} from '../services/auth-guard-unauthorized';
import {Rounds as RoundsService} from '../services/rounds';

export const roundsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: RouterDict.roundsList
  },
  {
    path: '',
    component: Rounds,
    providers: [
      RoundsService
    ],
    canActivate: [authGuardUnauthorized],
    children: [
      {
        path: RouterDict.roundsList,
        component: RoundsList
      },
      {
        path: RouterDict.roundEditor,
        component: RoundEdit
      },
      {
        path: RouterDict.roundEditor + '/:id',
        component: RoundEdit
      },
      {
        path: ':id',
        component: Round,
        children: [
          {path: RouterDict.todayTasks, component: Today},
          {path: RouterDict.tasksList, component: TasksList},
          {path: RouterDict.taskEditor + '/:id', component: Task},
          {path: RouterDict.taskEditor, component: Task},
          {path: RouterDict.timesOfDayOrder, component: TimesOfDayOrder},
          {path: '**', redirectTo: RouterDict.todayTasks}
        ]
      }
    ]
  },
  {path: '**', redirectTo: RouterDict.roundsList}
];
