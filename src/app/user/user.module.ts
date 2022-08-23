import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {TaskService} from './views/rounds/round/tasks/task/task.service';
import {RoundsService} from './views/rounds/rounds.service';
import {
  UserDialogConfirmDeleteComponent
} from './views/user-settings/user-dialog-confirm-delete/user-dialog-confirm-delete.component';
import {UserSettingsComponent} from './views/user-settings/user-settings.component';

@NgModule({
  declarations: [
    UserComponent,
    UserDialogConfirmDeleteComponent,
    UserSettingsComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    UserRoutingModule
  ],
  providers: [
    TaskService,
    RoundsService
  ],
  entryComponents: [
    UserDialogConfirmDeleteComponent,
    UserSettingsComponent
  ]
})
export class UserModule {
}
