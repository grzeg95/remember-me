import {PreloadAllModules, RouterModule, Routes} from '@angular/router';

import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {NgModule} from '@angular/core';
import {AuthGuardGuestService} from './auth/auth.guard.guest.service';
import {GuestComponent} from './guest/guest.component';

const appRoutes: Routes = [
  { path: '', canActivate: [AuthGuardGuestService], component: GuestComponent, pathMatch: 'full' },
  { path: 'user', loadChildren: () => import('./user/user.module').then((m) => m.UserModule) },
  { path: '**', redirectTo: '' }
];

@NgModule({
  providers: [ {provide: LocationStrategy, useClass: HashLocationStrategy} ],
  imports: [ RouterModule.forRoot(appRoutes, {preloadingStrategy: PreloadAllModules}) ],
  exports: [ RouterModule ]
})

export class AppRoutingModule {}
