import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {environment} from '../../environments/environment';
import {listEqual} from '../user/task/task.component';
import {AuthService} from './auth.service';

@Component({
  selector: 'app-callback',
  template: ``
})
export class AuthCallbackComponent implements OnInit {

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {

    const requireQueryKeys = ['access_token', 'scope', 'expires_in', 'token_type', 'state'];
    const routerQueryKeys = (this.router.parseUrl(this.router.url).fragment || '').split('&').map((part) => part.split('=')[0]);

    if (environment.production || !listEqual(requireQueryKeys, routerQueryKeys)) {
      this.router.navigate(['/']);
    } else {
      this.auth.auth0HandleLoginCallback();
    }

  }

}
