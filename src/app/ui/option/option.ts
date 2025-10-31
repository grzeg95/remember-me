import {Component, EventEmitter, input, Output, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-option',
  imports: [],
  templateUrl: './option.html',
  styleUrl: './option.scss',
  host: {
    'class': 'app-option',
    '(click)': 'onClick()'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.None
})
export class Option {

  @Output() readonly onSelectionChange = new EventEmitter<Option>();
  value = input<any>();

  onClick() {
    this.onSelectionChange.emit(this);
  }
}
