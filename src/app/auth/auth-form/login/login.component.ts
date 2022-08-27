import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserCredential} from 'firebase/auth';
import {Subscription} from "rxjs";
import {ConnectionService} from '../../../connection.service';
import {AuthService} from '../../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  email = this.loginForm.get('email');
  password = this.loginForm.get('password');

  isOnlineSub: Subscription;
  isOnline: boolean;

  userCredential: UserCredential;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  ngOnDestroy(): void {
    this.isOnlineSub.unsubscribe();
  }

  sendEmailVerification(): void {
    if (this.userCredential) {
      this.loginForm.disable();

      this.authService.sendEmailVerification(this.userCredential.user).then(() => {
        this.snackBar.open('Email verification has been sent 🙂', 'X', {duration: 10000});
        this.doneEmitter.next();
      }).catch(() => {
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.loginForm.enable();
      });
    }
  }

  login(): void {
    this.loginForm.disable();
    this.authService.signInWithEmailAndPassword(this.email.value, this.password.value).then((userCredential) => {
      this.loginForm.enable();

      if (userCredential) {

        if (!userCredential.user.emailVerified) {
          this.userCredential = userCredential;
        }

        if (userCredential.user.emailVerified) {
          this.authService.whileLoginIn$.next(true);
          this.doneEmitter.next();
        }
      }
    }).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.loginForm.enable();
    });
  }
}
