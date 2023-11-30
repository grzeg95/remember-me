import {Component} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogActions, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogActions,
    MatButtonModule
  ],
  templateUrl: 'task-dialog-confirm-delete.component.html'
})
export class TaskDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<TaskDialogConfirmDeleteComponent>) {
  }
}
