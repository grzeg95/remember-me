import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  templateUrl: 'task-dialog-confirm-delete.component.html',
  styleUrls: ['task-dialog-confirm-delete.component.scss'],
})
export class TaskDialogConfirmDeleteComponent {

  constructor(private dialogRef: MatDialogRef<TaskDialogConfirmDeleteComponent>) {}

  rejectDelete(): void {
    this.dialogRef.close(false);
  }

  confirmDelete(): void {
    this.dialogRef.close(true);
  }

}
