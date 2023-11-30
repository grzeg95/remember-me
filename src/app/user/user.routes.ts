import {Routes} from '@angular/router';
import {authGuardUnauthorized} from 'auth';
import {RouterDict} from '../app.constants';
import {UserComponent} from './user.component';

export const userRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: RouterDict.rounds
  },
  {
    path: '',
    component: UserComponent,
    providers: [],
    canActivate: [authGuardUnauthorized],
    children: [
      {
        path: RouterDict.rounds,
        loadChildren: () => import('./views/rounds/rounds.routes').then((m) => m.roundsRoutes)
      }
    ],
  },
  {path: '**', redirectTo: RouterDict.rounds}
];
