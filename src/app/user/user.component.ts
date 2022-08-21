import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {RouterDict} from '../app.constants';
import {AuthService} from '../auth/auth.service';

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
