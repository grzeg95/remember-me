import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {faUser, faGear} from '@fortawesome/free-solid-svg-icons';
import {AuthService} from '../../../auth/auth.service';
import {UserData} from '../../../auth/user-data.model';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent implements OnInit, OnDestroy {

  faUser = faUser;
  faGear = faGear;

  get userData(): UserData {
    return this.authService.userData;
  }

  constructor(
    public dialogRef: MatDialogRef<UserSettingsComponent>,
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }
}
