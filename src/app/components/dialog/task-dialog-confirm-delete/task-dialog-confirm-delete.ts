import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {Button} from '../../../ui/button/button';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  styleUrl: 'task-dialog-confirm-delete.scss',
  standalone: true,
  imports: [
    Button
  ],
  templateUrl: 'task-dialog-confirm-delete.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-task-dialog-confirm-delete',
    'animate.enter': 'enter-animation'
  }
})
export class TaskDialogConfirmDelete {

  protected readonly _dialogRef = inject(DialogRef<boolean>);
}
