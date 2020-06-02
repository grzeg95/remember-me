import {DragDropModule} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTableModule} from '@angular/material/table';
import {RouterModule} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {SharedModule} from '../shared.module';
import {TaskDialogConfirmDeleteComponent} from './task/task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskDialogTimeOfDay} from './task/task-dialog-time-of-day/task-dialog-time-of-day.component';
import {TaskComponent} from './task/task.component';
import {TasksComponent} from './tasks/tasks.component';
import {TimesOfDayOrderComponent} from './times-of-day-order/times-of-day-order.component';
import {TodayComponent} from './today/today.component';
import {UserNavComponent} from './user-nav/user-nav.component';
import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {UserService} from './user.service';

@NgModule({
  declarations: [
    UserComponent,
    TasksComponent,
    TaskComponent,
    TodayComponent,
    UserNavComponent,
    TimesOfDayOrderComponent,
    TaskDialogTimeOfDay,
    TaskDialogConfirmDeleteComponent
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
    MatButtonModule,
    FontAwesomeModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
  ],
  providers: [
    UserService
  ],
  entryComponents: [
    TaskDialogTimeOfDay,
    TaskDialogConfirmDeleteComponent
  ]
})
export class UserModule {
}
