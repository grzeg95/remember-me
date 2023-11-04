import {Component} from '@angular/core';
import {AuthService} from 'auth';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent {

  user$ = this.authService.user$;

  constructor(
    private authService: AuthService
  ) {
  }
}
