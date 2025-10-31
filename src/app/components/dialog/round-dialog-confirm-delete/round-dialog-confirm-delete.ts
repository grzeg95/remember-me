import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {Button} from '../../../ui/button/button';

@Component({
  selector: 'app-round-dialog-confirm-delete',
  standalone: true,
  imports: [
    Button
  ],
  templateUrl: 'round-dialog-confirm-delete.html',
  styleUrl: 'round-dialog-confirm-delete.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-round-dialog-confirm-delete',
    'animate.enter': 'enter-animation'
  }
})
export class RoundDialogConfirmDelete {

  protected readonly _dialogRef = inject(DialogRef<boolean>);
}
