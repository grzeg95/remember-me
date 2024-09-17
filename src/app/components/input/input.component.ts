import {Component, HostBinding, Input} from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {

  @Input({required: true}) placeholder!: string;
  @Input() removeAble = false;
  @Input() withHint = false;

  @HostBinding('class.app-input--disabled') @Input() disabled!: boolean;
  value = '';

  onChange = (_: any) => {
  };

  onTouched = () => {
  };

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }

  writeValue(value: string): void {
    this.value = value;
  }

  _onChange($event: Event) {
    $event.stopPropagation();

    if (this.disabled) {
      $event.preventDefault();
      return;
    }

    this.onChange(($event.target as HTMLInputElement).value);
  }

  _onInput($event: Event) {
    $event.stopPropagation();

    if (this.disabled) {
      $event.preventDefault();
      return;
    }

    this.onChange(($event.target as HTMLInputElement).value);
  }

  _onTouched() {
    this.onTouched();
  }
}
