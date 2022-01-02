import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {faTasks, faUser} from '@fortawesome/free-solid-svg-icons';
import {faEyeSlash} from '@fortawesome/free-regular-svg-icons';
import {Observable} from 'rxjs';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {GoogleAnalyticsService} from '../google-analytics.service';

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
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(private authService: AuthService,
              private appService: AppService,
              private googleAnalyticsService: GoogleAnalyticsService) {
  }

  googleLogin(): void {
    this.googleAnalyticsService.eventEmitter('login_button', 'google', 'click');
    this.authService.googleLogin();
  }

  anonymouslyLogin(): void {
    this.googleAnalyticsService.eventEmitter('login_button', 'guest', 'click');
    this.authService.anonymouslyLogin();
  }

  signOut(): Promise<boolean> {
    return this.authService.signOut();
  }

  @HostListener('document:click', ['$event'])
  documentClick(event: Event): void {

    if (this.menuToggleCheckbox && (this.menuToggleCheckbox.nativeElement as HTMLInputElement).checked) {
      let element: HTMLElement = event.target as HTMLElement;
      let find = false;

      for (let i = 0; i < 5; ++i) {
        if (element.classList.contains('menu-toggle')) {
          find = true;
        }
        element = element.parentElement;
      }

      if (!find) {
        (this.menuToggleCheckbox.nativeElement as HTMLInputElement).checked = false;
      }
    }
  }
}
