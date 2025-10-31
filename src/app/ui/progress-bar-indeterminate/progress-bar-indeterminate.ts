import {Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-progress-bar-indeterminate',
  imports: [],
  templateUrl: './progress-bar-indeterminate.html',
  standalone: true,
  styleUrl: './progress-bar-indeterminate.scss',
  host: {
    'class': 'app-progress-bar-indeterminate'
  },
  encapsulation: ViewEncapsulation.None
})
export class ProgressBarIndeterminate {
}
