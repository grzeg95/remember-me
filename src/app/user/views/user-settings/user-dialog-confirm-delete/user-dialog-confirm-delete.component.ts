import {Component} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogActions, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';

@Component({
  selector: 'app-user-dialog-confirm-delete',
  standalone: true,
  imports: [MatDialogActions, MatButtonModule, MatDialogTitle],
  templateUrl: './user-dialog-confirm-delete.component.html'
})
export class UserDialogConfirmDeleteComponent {
  constructor(public dialogRef: MatDialogRef<UserDialogConfirmDeleteComponent>) {
  }
}
