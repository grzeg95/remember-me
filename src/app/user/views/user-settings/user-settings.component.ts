import { Component, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {faUser, faGear} from '@fortawesome/free-solid-svg-icons';
import { Subscription } from "rxjs";
import {AuthService} from '../../../auth/auth.service';
import {User} from '../../../auth/user-data.model';

import {UserDialogConfirmDeleteComponent} from './user-dialog-confirm-delete/user-dialog-confirm-delete.component';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent implements OnInit {

  faUser = faUser;
  faGear = faGear;

  user: User;
  userSub: Subscription;

  constructor(
    public dialogRef: MatDialogRef<UserSettingsComponent>,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe((user) => this.user = user);
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
  }

  openRemoveAccountConfirmPrompt(): void {
    const dialog = this.dialog.open(UserDialogConfirmDeleteComponent);

    dialog.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        if (this.user) {
          this.user.firebaseUser.delete().then(() => this.authService.signOut()).finally(() => {
            this.dialogRef.close();
          });
        } else {
          this.dialogRef.close();
        }
      }
    });
  }
}
