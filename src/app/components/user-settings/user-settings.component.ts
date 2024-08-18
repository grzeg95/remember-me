import {NgClass, NgStyle} from '@angular/common';
import {Component, effect, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogActions, MatDialogRef} from '@angular/material/dialog';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGear, faUser} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {InternalImgSecureDirective} from '../../directives/internal-img-secure.directive';
import {AuthService} from '../../services/auth.service';
import {NewPasswordComponent} from '../new-password/new-password.component';
import {UserDialogConfirmDeleteComponent} from '../user-dialog-confirm-delete/user-dialog-confirm-delete.component';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [MatDialogActions, MatExpansionModule, FontAwesomeModule, InternalImgSecureDirective, MatButtonModule, MatProgressSpinnerModule, NewPasswordComponent, NgStyle, NgClass],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.scss'
})
export class UserSettingsComponent {

  faUser = faUser;
  faGear = faGear;

  user = toSignal(this.authService.user$);
  isPhotoUploading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<UserSettingsComponent>,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    effect(() => {
      const user = this.user();
      if (!user) {
        this.dialogRef.close();
      }
    })
  }

  openRemoveAccountConfirmPrompt(): void {
    const dialog = this.dialog.open(UserDialogConfirmDeleteComponent);

    dialog.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        if (this.user()) {
          this.authService.deleteUser().pipe(catchError(() => {
            this.snackBar.open('Some went wrong 🤫 Try again 🙂');
            return NEVER;
          })).subscribe();
        }
      }
    });
  }

  fileChange(event: any) {

    const input: HTMLInputElement = event.target;
    const fileList: FileList = input.files as FileList;

    if (fileList.length > 0) {
      this.isPhotoUploading.set(true);
      this.authService.uploadProfileImage(fileList[0]).pipe(catchError((error) => {
        this.isPhotoUploading.set(false);
        input.value = '';
        this.snackBar.open(error.error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })).subscribe((success) => {
        input.value = '';
        this.isPhotoUploading.set(false);
        this.snackBar.open(success.message || 'Your operation has been done 😉');
      });
    }
  }

  removePhoto() {
    this.authService.removePhoto().subscribe();
  }

  cookiebotRenew() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
