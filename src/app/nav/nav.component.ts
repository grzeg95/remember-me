import {Component, ElementRef, ViewChild} from '@angular/core';
import {faEllipsisV, faTasks, faUser} from '@fortawesome/free-solid-svg-icons';
import {faEyeSlash} from '@fortawesome/free-regular-svg-icons';
import {Observable} from 'rxjs';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get isLoggedIn(): boolean | null {
    return this.authService.isLoggedIn;
  }

  get userPhoto(): string {

    if (this.authService.userData) {
      return this.authService.userData.photoURL;
    }

    return null;
  }

  get whileLoginIn(): boolean {
    return this.authService.whileLoginIn;
  }

  faTasks = faTasks;
  faUser = faUser;
  faEyeSlash = faEyeSlash;
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(private authService: AuthService,
              private appService: AppService) {
  }

  googleLogin(): void {
    this.authService.googleLogin();
  }

  anonymouslyLogin(): void {
    this.authService.anonymouslyLogin();
  }

  signOut(): Promise<boolean> {
    return this.authService.signOut();
  }

}
