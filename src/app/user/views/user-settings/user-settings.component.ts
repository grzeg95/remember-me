import {Component} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {faUser, faGear} from '@fortawesome/free-solid-svg-icons';
import {AuthService} from '../../../auth/auth.service';
import {UserData} from '../../../auth/user-data.model';
import {UserDialogConfirmDeleteComponent} from './user-dialog-confirm-delete/user-dialog-confirm-delete.component';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent {

  faUser = faUser;
  faGear = faGear;

  get userData(): UserData {
    return this.authService.userData;
  }

  constructor(
    public dialogRef: MatDialogRef<UserSettingsComponent>,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
  }

  openRemoveAccountConfirmPrompt(): void {
    const dialog = this.dialog.open(UserDialogConfirmDeleteComponent);

    dialog.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.authService.firebaseUser.delete().then(() => this.authService.signOut());
        this.dialogRef.close();
      }
    });
  }
}
