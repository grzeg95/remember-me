import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {faListUl, faSignOutAlt, faTasks, faUserCircle} from '@fortawesome/free-solid-svg-icons';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.sass'],
  host: {class: 'app'}
})
export class NavComponent {

  faUserCircle = faUserCircle;
  faTasks = faTasks;
  faListUl = faListUl;
  faSignOutAlt = faSignOutAlt;

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get userPhoto(): string {
    return this.authService.userData.photoURL;
  }

  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(private authService: AuthService) {}

  signOut(): Promise<boolean> {
    return this.authService.signOut();
  }

  googleAuth(): void {
    this.authService.googleAuth();
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
