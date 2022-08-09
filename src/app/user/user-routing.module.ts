import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {RouterDict} from '../app.constants';
import {AuthGuard} from '../auth/auth-guard.service';
import {UserComponent} from './user.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    data: {redirectUnauthorizedTo: ['/']},
    component: UserComponent,
    children: [
      {
        path: RouterDict.rounds,
        loadChildren: () => import('./views/rounds/rounds.module').then((m) => m.RoundsModule)
      }
    ]
  },
  { path: '**', redirectTo: RouterDict.rounds }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {
}
