import {Component, OnInit} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGear, faUser} from '@fortawesome/free-solid-svg-icons';
import {AuthService, User} from 'auth';
import {catchError, NEVER, Subscription} from 'rxjs';
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

  isPhotoUploading: boolean;

  constructor(
    public dialogRef: MatDialogRef<UserSettingsComponent>,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe((user) => {
      if (!user) {
        this.dialogRef.close();
        return;
      }
      this.user = user;
      this.isPhotoUploading = false;
    });
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
  }

  openRemoveAccountConfirmPrompt(): void {
    const dialog = this.dialog.open(UserDialogConfirmDeleteComponent);

    dialog.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        if (this.user) {
          this.authService.deleteUser().pipe(catchError(() => {
            this.snackBar.open('Some went wrong 🤫 Try again 🙂');
            return NEVER;
          })).subscribe();
        }
      }
    });
  }

  fileChange(event) {

    const input: HTMLInputElement = event.target;
    const fileList: FileList = input.files;

    if (fileList.length > 0) {
      this.isPhotoUploading = true;
      this.authService.uploadProfileImage(fileList[0]).pipe(catchError((error) => {
        this.isPhotoUploading = false;
        input.value = '';
        this.snackBar.open(error.error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })).subscribe((success) => {
        input.value = '';
        this.snackBar.open(success.message || 'Your operation has been done 😉');
      });
    }
  }

  removePhoto() {
    this.authService.removePhoto().subscribe();
  }
}
