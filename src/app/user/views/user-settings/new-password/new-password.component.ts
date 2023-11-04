import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AuthService} from 'auth';
import {catchError, NEVER, Subscription} from 'rxjs';
import {ConnectionService, CustomValidators} from 'services';

@Component({
  selector: 'app-new-password-component',
  templateUrl: 'new-password.component.html'
})
export class NewPasswordComponent implements OnInit, OnDestroy {

  newPasswordForm: FormGroup = new FormGroup({
    newPassword: new FormControl('', [Validators.required]),
    confirmNewPassword: new FormControl('', [Validators.required])
  });

  newPassword = this.newPasswordForm.get('newPassword') as FormControl;
  confirmNewPassword = this.newPasswordForm.get('confirmNewPassword') as FormControl;

  isOnlineSub: Subscription;
  isOnline: boolean;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
    this.confirmNewPassword.addValidators(CustomValidators.equalsToOtherFormControl(this.newPassword));

    this.newPassword.valueChanges.subscribe(() => {
      if (!this.newPasswordForm.disabled && (this.confirmNewPassword.dirty || this.confirmNewPassword.touched)) {
        this.confirmNewPassword.updateValueAndValidity();
      }
    });
  }

  ngOnDestroy(): void {
    this.isOnlineSub.unsubscribe();
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
