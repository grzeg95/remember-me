import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from 'auth';
import {RouterDict} from '../app.constants';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent {

  user$ = this.authService.user$;

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict.user, true);
  }

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
  }
}
