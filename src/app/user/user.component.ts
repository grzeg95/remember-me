import {ChangeDetectionStrategy, Component} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {AuthService} from 'auth';
import {RouterDict} from '../app.constants';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserComponent {

  user = toSignal(this.authService.user$);

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict.user, true);
  }

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
  }
}
