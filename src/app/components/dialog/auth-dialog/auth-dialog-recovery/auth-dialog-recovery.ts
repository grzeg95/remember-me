import {Component, inject, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Auth} from '../../../../services/auth';
import {Button} from '../../../../ui/button/button';
import {Error} from '../../../../ui/form/error/error';
import {FormField} from '../../../../ui/form/form-field/form-field';
import {Input} from '../../../../ui/form/input';
import {Label} from '../../../../ui/form/label/label';
import {SnackBar} from '../../../../ui/snack-bar/snack-bar';

@Component({
  selector: 'app-auth-dialog-recovery',
  imports: [
    Button,
    Error,
    FormField,
    FormsModule,
    Input,
    Label,
    ReactiveFormsModule
  ],
  templateUrl: './auth-dialog-recovery.html',
  standalone: true,
  styleUrl: './auth-dialog-recovery.scss',
  host: {
    class: 'app-auth-dialog-recovery'
  },
  encapsulation: ViewEncapsulation.None
})
export class AuthDialogRecovery {

  private readonly _auth = inject(Auth);
  private _snackBar = inject(SnackBar);

  protected _form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  protected _onSubmit() {

    this._form.markAllAsTouched();
    this._form.updateValueAndValidity();

    if (this._form.invalid) {
      return;
    }

    const formValue = this._form.value;

    this._auth.sendPasswordResetEmail$(formValue.email!).subscribe({
      next: () => {
        this._snackBar.open('Check your email.', {duration: 3000});
      },
      error: (error) => {
        this._snackBar.open('Check your email.', {duration: 3000});
      }
    });
  }
}
