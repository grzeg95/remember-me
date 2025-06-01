import {AsyncPipe, NgClass, NgStyle} from '@angular/common';
import {Component, DestroyRef, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogActions, MatDialogRef} from '@angular/material/dialog';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGear, faUser} from '@fortawesome/free-solid-svg-icons';
import {catchError, combineLatest, NEVER} from 'rxjs';
import {InternalImgSecureDirective} from '../../directives/internal-img-secure.directive';
import {AuthService} from '../../services/auth.service';
import {UserService} from '../../services/user.service';
import {NewPasswordComponent} from '../new-password/new-password.component';
import {UserDialogConfirmDeleteComponent} from '../user-dialog-confirm-delete/user-dialog-confirm-delete.component';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [MatDialogActions, MatExpansionModule, FontAwesomeModule, InternalImgSecureDirective, MatButtonModule, MatProgressSpinnerModule, NewPasswordComponent, NgStyle, NgClass, AsyncPipe],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.scss'
})
export class UserSettingsComponent {

  protected readonly _faUser = faUser;
  protected readonly _faGear = faGear;

  protected readonly _user$ = this._authService.user$;
  protected readonly _firebaseUser$ = this._authService.firebaseUser$;
  protected readonly _isPhotoUploading = signal(false);

  constructor(
    protected readonly _dialogRef: MatDialogRef<UserSettingsComponent>,
    private readonly _authService: AuthService,
    private readonly _dialog: MatDialog,
    private readonly _snackBar: MatSnackBar,
    private readonly _userService: UserService,
    private readonly _destroyRef: DestroyRef
  ) {

    combineLatest([
      this._user$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef),
    ).subscribe(([user]) => {
      if (!user) {
        this._dialogRef.close();
      }
    });
  }

  openRemoveAccountConfirmPrompt(): void {
    const dialog = this._dialog.open(UserDialogConfirmDeleteComponent);

    dialog.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        if (this._user$.value) {
          this._authService.deleteUser().pipe(catchError(() => {
            this._snackBar.open('Some went wrong 🤫 Try again 🙂');
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
      this._isPhotoUploading.set(true);
      this._userService.uploadProfileImage(fileList[0]).pipe(catchError((error) => {
        this._isPhotoUploading.set(false);
        input.value = '';
        this._snackBar.open(error.error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })).subscribe((success) => {
        input.value = '';
        this._isPhotoUploading.set(false);
        this._snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }
  }

  removePhoto() {
    this._userService.removePhoto().subscribe();
  }
}
