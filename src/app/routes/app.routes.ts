import {Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {GuestComponent} from '../components/guest/guest.component';
import {authGuardLoggedIn} from '../services/auth-guard-logged-in.service';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuardLoggedIn],
    component: GuestComponent,
    pathMatch: 'full'
  },
  {
    path: RouterDict.user,
    loadChildren: () => import('./user.routes').then(m => m.userRoutes)
  },
  {path: '**', redirectTo: ''}
];
