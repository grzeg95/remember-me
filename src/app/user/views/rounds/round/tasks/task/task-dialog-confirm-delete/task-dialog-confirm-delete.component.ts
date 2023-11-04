import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  templateUrl: 'task-dialog-confirm-delete.component.html'
})
export class TaskDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<TaskDialogConfirmDeleteComponent>) {
  }
}
