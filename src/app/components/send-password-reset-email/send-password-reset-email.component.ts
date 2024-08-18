import {Component, EventEmitter, Output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService} from '../../services';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-send-password-reset-email',
  standalone: true,
  imports: [MatInputModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './send-password-reset-email.component.html'
})
export class SendPasswordResetEmailComponent {

  recoveryForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  email = this.recoveryForm.get('email');

  isOnline = this.connectionService.isOnline;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  sendPasswordResetEmail(): void {
    this.recoveryForm.disable();

    this.authService.sendPasswordResetEmail(this.email?.value).pipe(catchError(() => {
      this.sendPasswordResetEmailProceed();
      return NEVER;
    })).subscribe(() => this.sendPasswordResetEmailProceed());
  }

  sendPasswordResetEmailProceed(): void {
    this.snackBar.open('Password reset email has been sent 🙂', 'X', {duration: 10000});
    this.doneEmitter.next();
  }
}
