import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AuthService} from 'auth';
import {catchError, NEVER, Subscription} from 'rxjs';
import {ConnectionService} from '../../../connection.service';

@Component({
  selector: 'app-send-password-reset-email',
  templateUrl: './send-password-reset-email.component.html',
  styleUrls: ['./send-password-reset-email.component.scss']
})
export class SendPasswordResetEmailComponent implements OnInit, OnDestroy {

  recoveryForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  email = this.recoveryForm.get('email');

  isOnlineSub: Subscription;
  isOnline: boolean;

  @Output() doneEmitter = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  ngOnDestroy(): void {
    this.isOnlineSub.unsubscribe();
  }

  sendPasswordResetEmail(): void {
    this.recoveryForm.disable();

    this.authService.sendPasswordResetEmail$(this.email.value).pipe(catchError(() => {
      this.sendPasswordResetEmailProceed();
      return NEVER;
    })).subscribe(() => this.sendPasswordResetEmailProceed());
  }

  sendPasswordResetEmailProceed(): void {
    this.snackBar.open('Password reset email has been sent 🙂', 'X', {duration: 10000});
    this.doneEmitter.next();
  }
}
