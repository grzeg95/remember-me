import {Component, EventEmitter, Output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserCredential} from 'firebase/auth';
import {catchError, NEVER} from 'rxjs';
import {InputDirective} from '../../directives/form/input.directive';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {ErrorComponent} from '../error/error.component';
import {FormFieldComponent} from '../form/form-field/form-field.component';
import {LabelComponent} from '../form/label/label.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressBar,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective
  ],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  protected readonly _loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  protected readonly _email = this._loginForm.get('email');
  protected readonly _password = this._loginForm.get('password');

  protected readonly _isOnline = toSignal(this._connectionService.isOnline$);
  protected readonly _userCredential = signal<UserCredential | undefined>(undefined);

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private readonly _authService: AuthService,
    private readonly _connectionService: ConnectionService,
    private readonly _snackBar: MatSnackBar
  ) {
  }

  sendEmailVerification(): void {

    const userCredential = this._userCredential();

    if (userCredential) {

      this._loginForm.disable();

      this._authService.sendEmailVerification(userCredential.user).pipe(catchError(() => {
        this._snackBar.open('Some went wrong 🤫 Try again 🙂');
        this._loginForm.enable();
        return NEVER;
      })).subscribe(() => {
        this._snackBar.open('Email verification has been sent 🙂', 'X', {duration: 10000});
        this.doneEmitter.next();
      });
    }
  }

  login() {

    this._loginForm.disable();

    this._authService.signInWithEmailAndPassword(this._loginForm.get('email')?.value, this._loginForm.get('password')?.value).pipe(
      catchError(() => {
        this._snackBar.open('Some went wrong 🤫 Try again 🙂');
        this._loginForm.enable();
        return NEVER;
      })
    ).subscribe((userCredential) => {

      this._loginForm.enable();

      if (userCredential) {

        if (!userCredential.user.emailVerified) {
          this._userCredential.set(userCredential);
        }

        if (userCredential.user.emailVerified) {
          this.doneEmitter.next();
        }
      }
    });
  }
}
