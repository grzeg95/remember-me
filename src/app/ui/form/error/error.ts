import {Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-error',
  imports: [],
  templateUrl: './error.html',
  styleUrl: './error.scss',
  host: {
    'class': 'app-error'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.None
})
export class Error {
}
