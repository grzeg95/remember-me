import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subscription} from "rxjs";
import {ConnectionService} from '../../../connection.service';
import {CustomValidators} from '../../../custom-validators';
import {AuthService} from '../../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {

  registerForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  email = this.registerForm.get('email');
  password = this.registerForm.get('password');
  confirmPassword = this.registerForm.get('confirmPassword');

  isOnlineSub: Subscription;
  isOnline: boolean;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);

    this.registerForm.get('confirmPassword').addValidators(CustomValidators.equalsToOtherFormControl(this.registerForm.get('password') as FormControl));

    this.password.valueChanges.subscribe(() => {
      if (!this.registerForm.disabled && (this.confirmPassword.dirty || this.confirmPassword.touched)) {
        this.confirmPassword.updateValueAndValidity();
      }
    });
  }

  ngOnDestroy(): void {
    this.isOnlineSub.unsubscribe();
  }

  register(): void {
    this.registerForm.disable();
    this.authService.createUserWithEmailAndPassword(this.email.value, this.password.value).then((action) => {
      this.registerForm.enable();
      if (action) {

        this.snackBar.open(action.message, 'X', {duration: 20000});

        if (action.code === 'user-created') {
          this.doneEmitter.next();
        }
      }
    }).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.registerForm.enable();
    })
  }
}
