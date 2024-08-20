import {Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {UserComponent} from '../components/user/user.component';

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
    children: [
      {
        path: RouterDict.rounds,
        loadChildren: () => import('./rounds.routes').then((m) => m.roundsRoutes)
      }
    ],
  },
  {path: '**', redirectTo: RouterDict.rounds}
];
