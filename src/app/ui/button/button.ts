import {Component, input, ViewEncapsulation} from '@angular/core';

type Appearance = 'primary' | 'danger' | 'stroked';
type Disabled = 'true' | 'false' | '' | boolean | undefined;

@Component({
  selector: 'button[app-button]',
  imports: [],
  template: '<ng-content/>',
  styleUrl: './button.scss',
  host: {
    'class': 'app-button',
    '[class.primary]': 'appearance() === "primary"',
    '[class.danger]': 'appearance() === "danger"',
    '[class.stroked]': 'appearance() === "stroked"',
    '[class.disabled]': 'disabled() !== false && disabled() !== "false"'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.Emulated
})
export class Button {

  appearance = input<Appearance>('primary');
  disabled = input<Disabled>(false);
}
