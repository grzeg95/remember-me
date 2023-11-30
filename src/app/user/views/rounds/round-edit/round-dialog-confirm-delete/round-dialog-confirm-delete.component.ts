import {Component} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogActions, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';

@Component({
  selector: 'app-round-dialog-confirm-delete',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogActions,
    MatButtonModule
  ],
  templateUrl: 'round-dialog-confirm-delete.component.html'
})
export class RoundDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<RoundDialogConfirmDeleteComponent>) {
  }
}
