import {Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [],
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-menu-item'
  }
})
export class MenuItemComponent {

}
