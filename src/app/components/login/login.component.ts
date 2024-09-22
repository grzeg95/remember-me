import {Component, EventEmitter, Output, signal, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserCredential} from 'firebase/auth';
import {catchError, NEVER} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {ButtonComponent} from '../button/button.component';
import {InputComponent} from '../input/input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressBar, ButtonComponent, InputComponent],
  styleUrl: './login.component.scss',
  templateUrl: './login.component.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-login'
  }
})
export class LoginComponent {

  protected readonly _loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  protected readonly _email = this._loginForm.get('email');
  protected readonly _password = this._loginForm.get('password');

  protected readonly _isOnline = this._connectionService.isOnlineSig.get();
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
