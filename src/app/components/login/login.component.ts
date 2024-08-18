import {Component, EventEmitter, Output, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserCredential} from 'firebase/auth';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService} from '../../services';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  email = this.loginForm.get('email');
  password = this.loginForm.get('password');

  isOnline = this.connectionService.isOnline;
  userCredential = signal<UserCredential | undefined>(undefined);

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  sendEmailVerification(): void {

    const userCredential = this.userCredential();

    if (userCredential) {

      this.loginForm.disable();

      this.authService.sendEmailVerification(userCredential.user).pipe(catchError(() => {
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.loginForm.enable();
        return NEVER;
      })).subscribe(() => {
        this.snackBar.open('Email verification has been sent 🙂', 'X', {duration: 10000});
        this.doneEmitter.next();
      });
    }
  }

  login() {
    this.loginForm.disable();

    this.authService.signInWithEmailAndPassword(this.loginForm.get('email')?.value, this.loginForm.get('password')?.value).pipe(catchError(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.loginForm.enable();
      return NEVER;
    })).subscribe((userCredential) => {
      this.loginForm.enable();

      if (userCredential) {

        if (!userCredential.user.emailVerified) {
          this.userCredential.set(userCredential);
        }

        if (userCredential.user.emailVerified) {
          this.doneEmitter.next();
        }
      }
    });
  }
}
