import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService, CustomValidators} from '../../services';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatInputModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  email = this.registerForm.get('email');
  password = this.registerForm.get('password');
  confirmPassword = this.registerForm.get('confirmPassword');

  isOnline = this.connectionService.isOnline;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {

    this.confirmPassword?.addValidators(CustomValidators.equalsToOtherFormControl(this.registerForm.get('password') as FormControl));

    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      if (!this.registerForm.disabled && (this.confirmPassword?.dirty || this.confirmPassword?.touched)) {
        this.confirmPassword.updateValueAndValidity();
      }
    });
  }

  register(): void {
    this.registerForm.disable();
    this.authService.createUserWithEmailAndPassword(this.email?.value, this.password?.value).pipe(catchError((e) => {
      this.snackBar.open(e.message, 'X', {duration: 20000});
      this.registerForm.enable();
      return NEVER;
    })).subscribe((r) => {
      this.registerForm.enable();
      if (r) {

        this.snackBar.open(r.message, 'X', {duration: 20000});

        if (r.code === 'user-created') {
          this.doneEmitter.next();
        }
      }
    });
  }
}
