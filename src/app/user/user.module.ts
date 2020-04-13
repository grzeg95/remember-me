import {DragDropModule} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTableModule} from '@angular/material/table';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared.module';
import {TaskEditorComponent} from './task-editor/task-editor.component';
import {TasksListComponent} from './tasks-list/tasks-list.component';
import {TodayOrderComponent} from './today-order/today-order.component';
import {TodayComponent} from './today/today.component';
import {UserNavComponent} from './user-nav/user-nav.component';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {UserService} from './user.service';

@NgModule({
  declarations: [
    UserComponent,
    TasksListComponent,
    TaskEditorComponent,
    TodayComponent,
    UserNavComponent,
    TodayOrderComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    UserRoutingModule,
    MatProgressBarModule,
    MatTableModule,
    FormsModule,
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  providers: [
    UserService
  ]
})
export class UserModule {
}
