import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, NEVER} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {CustomValidators} from '../../services/custom-validators';
import {ErrorDirective, InputDirective, LabelDirective} from '../ui/form-field/directives';
import {FormFieldComponent} from '../ui/form-field/form-field.component';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    FormFieldComponent,
    LabelDirective,
    InputDirective,
    ErrorDirective
  ],
  templateUrl: './new-password.component.html'
})
export class NewPasswordComponent implements OnInit {

  protected readonly _newPasswordForm: FormGroup = new FormGroup({
    newPassword: new FormControl('', [Validators.required]),
    confirmNewPassword: new FormControl('', [Validators.required])
  });

  protected readonly _newPassword = this._newPasswordForm.get('newPassword') as FormControl;
  protected readonly _confirmNewPassword = this._newPasswordForm.get('confirmNewPassword') as FormControl;

  protected readonly _isOnline = this._connectionService.isOnlineSig.get();

  constructor(
    private readonly _authService: AuthService,
    private readonly _snackBar: MatSnackBar,
    private readonly _connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this._confirmNewPassword.addValidators(CustomValidators.equalsToOtherFormControl(this._newPassword));

    this._newPassword.valueChanges.subscribe(() => {
      if (!this._newPasswordForm.disabled && (this._confirmNewPassword.dirty || this._confirmNewPassword.touched)) {
        this._confirmNewPassword.updateValueAndValidity();
      }
    });
  }

  changePassword(): void {
    this._authService.updatePassword(this._newPassword.value).pipe(
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
