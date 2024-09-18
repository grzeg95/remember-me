import {Component, input, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-menu',
  }
})
export class MenuComponent {

  disabled = input<boolean>();
}
