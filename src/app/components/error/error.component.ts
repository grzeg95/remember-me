import {Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss',
  host: {
    class: 'app-error'
  },
  encapsulation: ViewEncapsulation.None
})
export class ErrorComponent {

}
