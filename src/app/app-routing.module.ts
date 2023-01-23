import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuardLoggedIn} from 'auth';
import {ExtraParametersRoutePipe} from 'services';
import {RouterDict} from './app.constants';
import {GuestComponent} from './guest/guest.component';

const appRoutes: Routes = [
  {
    path: '',
    canActivate: [ExtraParametersRoutePipe, AuthGuardLoggedIn],
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
