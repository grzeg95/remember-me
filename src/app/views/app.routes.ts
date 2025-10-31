import {Routes} from '@angular/router';
import {GuestComponent} from '../components/guest/guest.component';
import {RouterDict} from '../models/router-dict';
import {authGuardLoggedIn} from '../services/auth-guard-logged-in';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuardLoggedIn],
    component: GuestComponent,
    pathMatch: 'full'
  },
  {
    path: RouterDict.rounds,
    loadChildren: () => import('./rounds.routes').then(m => m.roundsRoutes)
  },
  {path: '**', redirectTo: ''}
];
