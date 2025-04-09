import {AsyncPipe, NgClass} from '@angular/common';
import {Component, signal, ViewChild} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogRef} from '@angular/material/dialog';
import {MatTabGroup} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {SvgDirective} from '../../directives/svg.directive';
import {AuthService} from '../../services/auth.service';
import {LoginComponent} from '../login/login.component';
import {RegisterComponent} from '../register/register.component';
import {SendPasswordResetEmailComponent} from '../send-password-reset-email/send-password-reset-email.component';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [
    LoginComponent,
    RegisterComponent,
    SendPasswordResetEmailComponent,
    MatToolbarModule,
    MatButtonModule,
    NgClass,
    SvgDirective,
    AsyncPipe
  ],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss'
})
export class AuthFormComponent {

  protected readonly _user$ = this._authService.user$;
  protected readonly _loadingUser$ = this._authService.loadingUser$;
  protected readonly _whileLoginIn$ = this._authService.whileLoginIn$;

  protected readonly _forms = [
    {
      name: 'login',
      label: 'Login'
    },
    {
      name: 'register',
      label: 'Register'
    },
    {
      name: 'send-password-reset-email',
      label: 'Recovery'
    }
  ];

  protected readonly _selectedForm = signal<string>('login');

  @ViewChild('matTabGroup') matTabGroup: MatTabGroup | undefined;

  constructor(
    protected readonly _dialogRef: MatDialogRef<AuthFormComponent>,
    private readonly _authService: AuthService
  ) {
  }
}
