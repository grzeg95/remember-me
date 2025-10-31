import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {RouterDict} from '../../../../models/router-dict';
import {Auth} from '../../../../services/auth';
import {Button} from '../../../../ui/button/button';
import {Error} from '../../../../ui/form/error/error';
import {FormField} from '../../../../ui/form/form-field/form-field';
import {Input} from '../../../../ui/form/input';
import {Label} from '../../../../ui/form/label/label';
import {SnackBar} from '../../../../ui/snack-bar/snack-bar';

@Component({
  selector: 'app-auth-dialog-login',
  imports: [
    FormField,
    Input,
    ReactiveFormsModule,
    Label,
    Error,
    Button,
    FormField,
    Label,
    Error,
    Input,
    Button
  ],
  templateUrl: './auth-dialog-login.html',
  standalone: true,
  styleUrl: './auth-dialog-login.scss',
  host: {
    class: 'app-auth-dialog-login'
  },
  encapsulation: ViewEncapsulation.None
})
export class AuthDialogLogin {

  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);
  private readonly _snackBar = inject(SnackBar);
  private readonly _dialogRef = inject(DialogRef);

  protected readonly _form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  protected _onSubmit() {

    this._form.markAllAsTouched();
    this._form.updateValueAndValidity();

    if (this._form.invalid) {
      return;
    }

    const formValue = this._form.value;

    this._auth.signInWithEmailAndPassword$(formValue.email!, formValue.password!).subscribe({
      next: () => {
        this._dialogRef.close();
        this._router.navigate(['/', RouterDict.rounds, RouterDict.roundsList]);
      },
      error: (error) => {

        const errorMap = new Map<string, string>();

        errorMap.set('auth/user-not-found', 'User not found.');
        errorMap.set('auth/wrong-password', 'User not found.');
        errorMap.set('Unknown', 'Unknown error. Try again.');

        let message = errorMap.get('Unknown')!;

        if (errorMap.has(error.code)) {
          message = errorMap.get(error.code)!;
        }

        this._snackBar.open(message, {duration: 3000});
      }
    });
  }
}
