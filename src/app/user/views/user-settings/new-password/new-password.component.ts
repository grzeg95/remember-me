import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AuthService} from 'auth';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService, CustomValidators} from 'services';

@Component({
  selector: 'app-new-password-component',
  templateUrl: 'new-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewPasswordComponent implements OnInit {

  newPasswordForm: FormGroup = new FormGroup({
    newPassword: new FormControl('', [Validators.required]),
    confirmNewPassword: new FormControl('', [Validators.required])
  });

  newPassword = this.newPasswordForm.get('newPassword') as FormControl;
  confirmNewPassword = this.newPasswordForm.get('confirmNewPassword') as FormControl;

  isOnline = toSignal(this.connectionService.isOnline$);

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.confirmNewPassword.addValidators(CustomValidators.equalsToOtherFormControl(this.newPassword));

    this.newPassword.valueChanges.subscribe(() => {
      if (!this.newPasswordForm.disabled && (this.confirmNewPassword.dirty || this.confirmNewPassword.touched)) {
        this.confirmNewPassword.updateValueAndValidity();
      }
    });
  }

  changePassword(): void {
    this.authService.updatePassword(this.newPassword.value).pipe(catchError((e) => {
      this.snackBar.open(e.message);
      return NEVER;
    })).subscribe((r) => {
      this.snackBar.open(r.message);
      if (r.code === 'auth/password-updated') {
        this.newPasswordForm.reset();
        this.newPasswordForm.markAsPristine();
        this.newPasswordForm.markAsUntouched();
        this.newPasswordForm.updateValueAndValidity();
      }
    });
  }
}
