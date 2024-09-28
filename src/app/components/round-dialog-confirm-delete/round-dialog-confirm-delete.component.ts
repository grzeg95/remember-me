import {DialogRef} from '@angular/cdk/dialog';
import {Component, ViewEncapsulation} from '@angular/core';
import {ButtonComponent} from '../button/button.component';

@Component({
  selector: 'app-round-dialog-confirm-delete',
  standalone: true,
  imports: [
    ButtonComponent
  ],
  templateUrl: 'round-dialog-confirm-delete.component.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-round-dialog-confirm-delete dialog',
  }
})
export class RoundDialogConfirmDeleteComponent {

  constructor(
    protected readonly _dialogRef: DialogRef<boolean>
  ) {
  }
}
