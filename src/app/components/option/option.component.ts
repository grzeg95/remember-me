import {Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-option',
  standalone: true,
  imports: [],
  templateUrl: './option.component.html',
  styleUrl: './option.component.scss',
  host: {
    '(click)': 'onClick()',
    class: 'app-option'
  },
  encapsulation: ViewEncapsulation.None
})
export class OptionComponent {

  @Output() readonly onSelectionChange = new EventEmitter<any>();
  @Input() value: any;

  onClick() {
    this.onSelectionChange.emit(this.value);
  }
}
