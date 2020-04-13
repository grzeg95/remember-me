import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.sass'],
  host: {class: 'app'}
})
export class NavComponent {

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get userPhoto(): string {
    return this.authService.userData.photoURL;
  }

  @ViewChild('menuToggleCheckbox')
  menuToggleCheckbox: ElementRef;

  constructor(private authService: AuthService) {
  }

  signOut(): Promise<boolean> {
    return this.authService.signOut();
  }

  googleAuth(): void {
    this.authService.googleAuth();
  }

  @HostListener('document:click', ['$event'])
  documentClick(event: Event): void {
    if (this.menuToggleCheckbox) {
      const id = (event.target as HTMLElement).id;
      if (!['icon-bars', 'menu-toggle-checkbox'].includes(id)) {
        (this.menuToggleCheckbox.nativeElement as HTMLInputElement).checked = false;
      }
    }
  }

}
