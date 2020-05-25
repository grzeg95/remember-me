import {PreloadAllModules, RouterModule, Routes} from '@angular/router';

import {NgModule} from '@angular/core';
import {RouterDict} from './app.constants';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {GuestComponent} from './guest/guest.component';

const appRoutes: Routes = [
  {path: '', canActivate: [AuthGuardGuestService], component: GuestComponent, pathMatch: 'full'},
  {path: RouterDict['user'], loadChildren: () => import('./user/user.module').then((m) => m.UserModule)},
  {path: '**', redirectTo: ''}
];

@NgModule({
  providers: [],
  imports: [RouterModule.forRoot(appRoutes, {preloadingStrategy: PreloadAllModules})],
  exports: [RouterModule]
})

export class AppRoutingModule {
}
