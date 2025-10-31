import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {RouterDict} from '../../../../models/router-dict';
import {Auth} from '../../../../services/auth';
import {Button} from '../../../../ui/button/button';
import {Error} from '../../../../ui/form/error/error';
import {FormField} from '../../../../ui/form/form-field/form-field';
import {Input} from '../../../../ui/form/input';
import {Label} from '../../../../ui/form/label/label';
import {SnackBar} from '../../../../ui/snack-bar/snack-bar';
import {equalsToOtherFormControl} from '../../../../utils/equals-to-other-control';

@Component({
  selector: 'app-auth-dialog-register',
  imports: [
    Button,
    Error,
    FormField,
    FormsModule,
    Input,
    Label,
    ReactiveFormsModule
  ],
  templateUrl: './auth-dialog-register.html',
  standalone: true,
  styleUrl: './auth-dialog-register.scss',
  host: {
    class: 'app-auth-dialog-register'
  },
  encapsulation: ViewEncapsulation.None
})
export class AuthDialogRegister {

  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);
  private readonly _snackBar = inject(SnackBar);
  private readonly _dialogRef = inject(DialogRef);

  protected _form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: new FormControl('')
  });

  ngOnInit(): void {
    this._form.get('confirmPassword')?.addValidators([equalsToOtherFormControl(this._form.get('password')!)])
  }

  protected _onSubmit() {

    this._form.markAllAsTouched();
    this._form.updateValueAndValidity();

    if (this._form.invalid) {
      return;
    }

    const formValue = this._form.value;

    this._auth.createUserWithEmailAndPassword$(formValue.email!, formValue.password!).subscribe({
      next: () => {
        this._dialogRef.close();
        this._router.navigate(['/', RouterDict.rounds, RouterDict.roundsList]);
      },
      error: (error) => {

        const errorMap = new Map<string, string>();

        errorMap.set('auth/email-already-in-use', 'Email already in use.');
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
