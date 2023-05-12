import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  templateUrl: 'task-dialog-confirm-delete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<TaskDialogConfirmDeleteComponent>) {
  }
}
