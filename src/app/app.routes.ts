import {Routes} from '@angular/router';
import {authGuardLoggedIn} from 'auth';
import {RouterDict} from './app.constants';
import {GuestComponent} from './guest/guest.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuardLoggedIn],
    component: GuestComponent,
    pathMatch: 'full'
  },
  {
    path: RouterDict.user,
    loadChildren: () => import('./user/user.routes').then(m => m.userRoutes)
  },
  {path: '**', redirectTo: ''}
];
