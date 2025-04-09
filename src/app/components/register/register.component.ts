import {AsyncPipe} from '@angular/common';
import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, NEVER} from 'rxjs';
import {InputDirective} from '../../directives/form/input.directive';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {CustomValidators} from '../../services/custom-validators';
import {ErrorComponent} from '../error/error.component';
import {FormFieldComponent} from '../form/form-field/form-field.component';
import {LabelComponent} from '../form/label/label.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressBar,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    AsyncPipe
  ],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {

  protected readonly _registerForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  protected readonly _email = this._registerForm.get('email');
  protected readonly _password = this._registerForm.get('password');
  protected readonly _confirmPassword = this._registerForm.get('confirmPassword');

  protected readonly _isOnline$ = this._connectionService.isOnline$;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private readonly _authService: AuthService,
    private readonly _connectionService: ConnectionService,
    private readonly _snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {

    this._confirmPassword?.addValidators(CustomValidators.equalsToOtherFormControl(this._registerForm.get('password') as FormControl));

    this._registerForm.get('password')?.valueChanges.subscribe(() => {
      if (!this._registerForm.disabled && (this._confirmPassword?.dirty || this._confirmPassword?.touched)) {
        this._confirmPassword.updateValueAndValidity();
      }
    });
  }

  register(): void {
    this._registerForm.disable();
    this._authService.createUserWithEmailAndPassword(this._email?.value, this._password?.value).pipe(
      catchError((e) => {
        this._snackBar.open(e.message, 'X', {duration: 20000});
        this._registerForm.enable();
        return NEVER;
      })
    ).subscribe((r) => {
      this._registerForm.enable();
      if (r) {

        this._snackBar.open(r.message, 'X', {duration: 20000});

        if (r.code === 'user-created') {
          this.doneEmitter.next();
        }
      }
    });
  }
}
