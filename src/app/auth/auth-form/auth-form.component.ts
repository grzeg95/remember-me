import {Component, ViewChild} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatTabGroup} from '@angular/material/tabs';

@Component({
  selector: 'app-auth-form',
  templateUrl: './auth-form.component.html',
  styleUrls: ['./auth-form.component.scss']
})
export class AuthFormComponent {

  forms = [
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

  selectedForm: string;

  @ViewChild('matTabGroup') matTabGroup: MatTabGroup;

  constructor(
    public dialogRef: MatDialogRef<AuthFormComponent>
  ) {
    this.selectForm('login');
  }

  selectForm(formName: string): void {
    if (this.selectedForm !== formName) {
      this.selectedForm = formName;
    }
  }
}
