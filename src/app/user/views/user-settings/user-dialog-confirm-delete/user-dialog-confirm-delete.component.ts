import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-user-dialog-confirm-delete',
  templateUrl: 'user-dialog-confirm-delete.component.html'
})
export class UserDialogConfirmDeleteComponent {

  constructor(public dialogRef: MatDialogRef<UserDialogConfirmDeleteComponent>) {
  }
}
