import {Component} from '@angular/core';

@Component({
  selector: 'app-label',
  imports: [],
  template: '<ng-content/>',
  standalone: true,
  styleUrl: './label.scss'
})
export class Label {
}
