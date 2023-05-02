import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {authGuardUnauthorized} from 'auth';
import {RouterDict} from '../app.constants';
import {UserComponent} from './user.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuardUnauthorized],
    component: UserComponent,
    children: [
      {
        path: RouterDict.rounds,
        loadChildren: () => import('./views/rounds/rounds.module').then((m) => m.RoundsModule)
      }
    ]
  },
  {path: '**', redirectTo: RouterDict.rounds}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {
}
