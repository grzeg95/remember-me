import {Component, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, NEVER} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {InputComponent} from "../input/input.component";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: 'app-send-password-reset-email',
  standalone: true,
  imports: [MatInputModule, ReactiveFormsModule, MatButtonModule, MatProgressBar, InputComponent, ButtonComponent],
  styleUrl: './send-password-reset-email.component.scss',
  templateUrl: './send-password-reset-email.component.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-send-password-reset-email'
  }
})
export class SendPasswordResetEmailComponent {

  protected readonly _recoveryForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  protected readonly _email = this._recoveryForm.get('email');

  protected readonly _isOnline = this._connectionService.isOnlineSig.get();

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private readonly _authService: AuthService,
    private readonly _connectionService: ConnectionService,
    private readonly _snackBar: MatSnackBar
  ) {
  }

  sendPasswordResetEmail(): void {

    this._recoveryForm.disable();

    this._authService.sendPasswordResetEmail(this._email?.value).pipe(catchError(() => {
      this.sendPasswordResetEmailProceed();
      return NEVER;
    })).subscribe(() => this.sendPasswordResetEmailProceed());
  }

  sendPasswordResetEmailProceed(): void {
    this._snackBar.open('Password reset email has been sent 🙂', 'X', {duration: 10000});
    this.doneEmitter.next();
  }
}
