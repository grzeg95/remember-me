import {AsyncPipe} from '@angular/common';
import {Component, inject, OnInit, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {catchError, NEVER} from 'rxjs';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Button} from '../../ui/button/button';
import {Error} from '../../ui/form/error/error';
import {FormField} from '../../ui/form/form-field/form-field';
import {Input} from '../../ui/form/input';
import {Label} from '../../ui/form/label/label';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {equalsToOtherFormControl} from '../../utils/equals-to-other-control';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AsyncPipe,
    Input,
    Label,
    FormField,
    Error,
    Button
  ],
  templateUrl: './new-password.html',
  styleUrl: './new-password.scss',
  host: {
    class: 'new-password'
  },
  encapsulation: ViewEncapsulation.None
})
export class NewPassword implements OnInit {

  private readonly _auth = inject(Auth);
  private readonly _snackBar = inject(SnackBar);
  private readonly _connection = inject(Connection);

  protected readonly _newPasswordForm: FormGroup = new FormGroup({
    newPassword: new FormControl('', [Validators.required]),
    confirmNewPassword: new FormControl('', [Validators.required])
  });

  protected readonly _newPassword = this._newPasswordForm.get('newPassword') as FormControl;
  protected readonly _confirmNewPassword = this._newPasswordForm.get('confirmNewPassword') as FormControl;

  protected readonly _isOnline$ = this._connection.isOnline$;

  ngOnInit(): void {

    this._confirmNewPassword.addValidators(equalsToOtherFormControl(this._newPassword));

    this._newPassword.valueChanges.subscribe(() => {
      if (!this._newPasswordForm.disabled && (this._confirmNewPassword.dirty || this._confirmNewPassword.touched)) {
        this._confirmNewPassword.updateValueAndValidity();
      }
    });
  }

  changePassword(): void {
    this._auth.updatePassword(this._newPassword.value).pipe(
      catchError((e) => {
        this._snackBar.open(e.message);
        return NEVER;
      })
    ).subscribe((r) => {
      this._snackBar.open(r.message);
      if (r.code === 'auth/password-updated') {
        this._newPasswordForm.reset();
        this._newPasswordForm.markAsPristine();
        this._newPasswordForm.markAsUntouched();
        this._newPasswordForm.updateValueAndValidity();
      }
    });
  }
}
