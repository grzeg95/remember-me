import {DialogRef} from '@angular/cdk/dialog';
import {Component, inject, signal, ViewEncapsulation} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Theme} from '../../../services/theme';
import {Button} from '../../../ui/button/button';
import {AuthDialogLogin} from './auth-dialog-login/auth-dialog-login';
import {AuthDialogRecovery} from './auth-dialog-recovery/auth-dialog-recovery';
import {AuthDialogRegister} from './auth-dialog-register/auth-dialog-register';

@Component({
  selector: 'app-auth-dialog',
  imports: [
    Button,
    ReactiveFormsModule,
    FormsModule,
    AuthDialogLogin,
    AuthDialogRegister,
    AuthDialogRecovery
  ],
  templateUrl: './auth-dialog.html',
  styleUrl: './auth-dialog.scss',
  host: {
    'class': 'app-auth-dialog',
    'animate.enter': 'enter-animation'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.None
})
export class AuthDialog {

  private readonly _theme = inject(Theme);
  protected _isDarkMode = toSignal(this._theme.isDarkMode$);

  protected _dialogRef = inject(DialogRef);

  protected _view = signal<'login' | 'register' | 'recovery'>('login');
}
