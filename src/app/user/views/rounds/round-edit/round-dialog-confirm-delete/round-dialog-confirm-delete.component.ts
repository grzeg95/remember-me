import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-round-dialog-confirm-delete',
  templateUrl: 'round-dialog-confirm-delete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<RoundDialogConfirmDeleteComponent>) {
  }
}
