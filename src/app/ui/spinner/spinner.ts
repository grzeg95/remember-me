import {Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-spinner',
  imports: [],
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'app-spinner'
  }
})
export class Spinner {

}
