import {NgClass} from '@angular/common';
import {AfterViewInit, Component, signal, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatTabGroup} from '@angular/material/tabs';
import {Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {LayoutService} from '../../services/layout.service';
import {ButtonComponent} from '../button/button.component';
import {LoginComponent} from '../login/login.component';
import {RegisterComponent} from '../register/register.component';
import {SendPasswordResetEmailComponent} from '../send-password-reset-email/send-password-reset-email.component';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [LoginComponent, RegisterComponent, SendPasswordResetEmailComponent, NgClass, ButtonComponent],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-auth-form'
  }
})
export class AuthFormComponent implements AfterViewInit {

  @ViewChild('closeButtonRef') closeButtonRef: TemplateRef<any> | undefined;

  protected readonly _user = this._authService.userSig.get();

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
    private readonly _authService: AuthService,
    private readonly _router: Router,
    private readonly _layoutService: LayoutService
  ) {
  }

  ngAfterViewInit(): void {
    this._layoutService.closePopUpButtonRefSig.set(this.closeButtonRef!);
    this._layoutService.popUpView.set(true);
  }

  closeView() {
    this._router.navigate(['/']);
    this._layoutService.closePopUpButtonRefSig.set(null);
    this._layoutService.popUpView.set(false);
  }
}
