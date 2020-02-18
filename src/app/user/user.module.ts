import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material';
import {MatTableModule} from '@angular/material/table';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {NavSecondComponent} from './nav-second/nav-second.component';
import {TaskEditorComponent} from './task-editor/task-editor.component';
import {TasksListComponent} from './tasks-list/tasks-list.component';
import {TodayComponent} from './today/today.component';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {UserService} from './user.service';

@NgModule({
  declarations: [
    UserComponent,
    TasksListComponent,
    TaskEditorComponent,
    TodayComponent,
    NavSecondComponent
  ],
    imports: [
        RouterModule,
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        UserRoutingModule,
        MatProgressBarModule,
        MatTableModule
    ],
  providers: [
    UserService
  ]
})
export class UserModule {}
