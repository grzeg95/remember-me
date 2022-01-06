import {AngularFireAuthGuard, redirectLoggedInTo} from '@angular/fire/compat/auth-guard';
import {RouterModule, Routes} from '@angular/router';

import {NgModule} from '@angular/core';
import {RouterDict} from './app.constants';
import {ExtraParametersGuard} from './extra-parameters-guard.service';
import {GuestComponent} from './guest/guest.component';

const redirectLoggedInToUserEnterView = () => redirectLoggedInTo(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);

const appRoutes: Routes = [
  {
    path: '',
    canActivate: [ExtraParametersGuard, AngularFireAuthGuard],
    data: {authGuardPipe: redirectLoggedInToUserEnterView},
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
