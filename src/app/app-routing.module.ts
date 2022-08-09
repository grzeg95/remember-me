import {RouterModule, Routes} from '@angular/router';

import {NgModule} from '@angular/core';
import {RouterDict} from './app.constants';
import {ExtraParametersGuard} from './extra-parameters-guard.service';
import {AuthGuard} from './auth/auth-guard.service';
import {GuestComponent} from './guest/guest.component';

const appRoutes: Routes = [
  {
    path: '',
    canActivate: [ExtraParametersGuard, AuthGuard],
    data: {redirectLoggedInTo: ['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]},
    component: GuestComponent,
    pathMatch: 'full'
  },
  {path: RouterDict.user, loadChildren: () => import('./user/user.module').then((m) => m.UserModule)},
  {path: '**', redirectTo: ''}
];

@NgModule({
  providers: [],
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})

export class AppRoutingModule {
}
