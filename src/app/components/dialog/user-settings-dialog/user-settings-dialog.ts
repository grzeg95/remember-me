import {Dialog, DialogRef} from '@angular/cdk/dialog';
import {NgClass, NgStyle} from '@angular/common';
import {Component, effect, inject, signal, ViewEncapsulation} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faGear, faUser} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {Auth} from '../../../services/auth';
import {User} from '../../../services/user';
import {Button} from '../../../ui/button/button';
import {SnackBar} from '../../../ui/snack-bar/snack-bar';
import {Spinner} from '../../../ui/spinner/spinner';
import {NewPassword} from '../../new-password/new-password';
import {UserDialogConfirmDelete} from '../user-dialog-confirm-delete/user-dialog-confirm-delete';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    NgStyle,
    NgClass,
    FaIconComponent,
    NewPassword,
    Button,
    Spinner
  ],
  templateUrl: './user-settings-dialog.html',
  styleUrl: './user-settings-dialog.scss',
  host: {
    class: 'app-user-settings',
    'animate.enter': 'enter-animation'
  },
  encapsulation: ViewEncapsulation.None
})
export class UserSettingsDialog {

  protected readonly _dialogRef = inject(DialogRef<UserSettingsDialog>);
  private readonly _auth = inject(Auth);
  private readonly _dialog = inject(Dialog);
  private readonly _snackBar = inject(SnackBar);
  private readonly _user = inject(User);

  protected readonly _faUser = faUser;
  protected readonly _faGear = faGear;

  protected readonly _authUser = toSignal(this._auth.authUser$);
  protected readonly _firestoreUser = toSignal(this._auth.firestoreUser$);
  protected readonly _isPhotoUploading = signal(false);

  constructor() {
    effect(() => {
      if (!this._authUser()) {
        this._dialogRef.close();
      }
    });
  }

  openRemoveAccountConfirmPrompt(): void {

    const dialog = this._dialog.open(UserDialogConfirmDelete);

    dialog.closed.subscribe((isConfirmed) => {

      if (isConfirmed) {
        this._auth.deleteUser$().pipe(catchError(() => {
          this._snackBar.open('Some went wrong 🤫 Try again 🙂');
          return NEVER;
        })).subscribe();
      }
    });
  }

  fileChange(event: any) {

    const input: HTMLInputElement = event.target;
    const fileList: FileList = input.files as FileList;

    if (fileList.length > 0) {
      this._isPhotoUploading.set(true);
      this._user.uploadProfileImage(fileList[0]).pipe(catchError((error) => {
        this._isPhotoUploading.set(false);
        input.value = '';
        this._snackBar.open(error.error.details || 'Some went wrong 🤫 Try again 🙂');
        this._isPhotoUploading.set(false);
        return NEVER;
      })).subscribe((success) => {
        input.value = '';
        this._isPhotoUploading.set(false);
        this._snackBar.open(success.data.details || 'Your operation has been done 😉');
      });
    }
  }

  removePhoto() {
    this._isPhotoUploading.set(true);
    this._user.removePhoto().pipe(
      catchError(() => {
        this._isPhotoUploading.set(false);
        return NEVER;
      })
    ).subscribe(() => {
      this._isPhotoUploading.set(false);
    });
  }
}
