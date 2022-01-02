import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {TaskService} from './views/rounds/round/tasks/task/task.service';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {UserService} from './user.service';
import {RoundService} from './views/rounds/round/round.service';
import {RoundsService} from './views/rounds/rounds.service';

@NgModule({
  declarations: [
    UserComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    UserRoutingModule
  ],
  providers: [
    UserService,
    TaskService,
    RoundService,
    RoundsService
  ]
})
export class UserModule {
}
