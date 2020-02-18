import {Component, HostListener} from '@angular/core';
import * as $ from 'jquery';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.sass'],
  host: { class: 'app' }
})
export class NavComponent {

  constructor(public authService: AuthService) {}

  @HostListener('document:click', ['$event'])
  documentClick(event: any): void {

    const id = event.target.id;
    if (!['icon-bars', 'menu-toggle-checkbox'].includes(id)) {
      $('#menu-toggle-checkbox').prop('checked', false);
    }

  }

}
