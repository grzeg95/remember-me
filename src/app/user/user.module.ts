import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {NewPasswordComponent} from './views/user-settings/new-password/new-password.component';
import {
  UserDialogConfirmDeleteComponent
} from './views/user-settings/user-dialog-confirm-delete/user-dialog-confirm-delete.component';
import {UserSettingsComponent} from './views/user-settings/user-settings.component';

@NgModule({
  declarations: [
    UserComponent,
    UserDialogConfirmDeleteComponent,
    UserSettingsComponent,
    NewPasswordComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    UserRoutingModule
  ]
})
export class UserModule {
}
