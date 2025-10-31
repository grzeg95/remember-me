import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {Button} from '../../../ui/button/button';

@Component({
  selector: 'app-user-dialog-confirm-delete',
  standalone: true,
  imports: [
    Button
  ],
  templateUrl: './user-dialog-confirm-delete.html',
  styleUrl: './user-dialog-confirm-delete.scss',
  host: {
    class: 'app-user-dialog-confirm-delete',
    'animate.enter': 'enter-animation'
  },
  encapsulation: ViewEncapsulation.None
})
export class UserDialogConfirmDelete {

  protected readonly _dialogRef = inject(DialogRef<boolean>);
}
