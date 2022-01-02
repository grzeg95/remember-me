import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-round-dialog-confirm-delete',
  templateUrl: 'round-dialog-confirm-delete.component.html'
})
export class RoundDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<RoundDialogConfirmDeleteComponent>) {
  }
}
