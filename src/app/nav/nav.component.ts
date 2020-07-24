import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {faListUl, faSignOutAlt, faTasks, faUser, faUserCircle} from '@fortawesome/free-solid-svg-icons';
import {Observable} from 'rxjs';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.sass'],
  host: {class: 'app'}
})
export class NavComponent {

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
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

  faUserCircle = faUserCircle;
  faTasks = faTasks;
  faListUl = faListUl;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(private authService: AuthService,
              private appService: AppService) {
  }

  auth(): void {
    this.authService.auth();
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
