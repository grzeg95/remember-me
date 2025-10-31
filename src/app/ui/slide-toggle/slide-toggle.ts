import {Component, forwardRef, Input, ViewEncapsulation} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

@Component({
  selector: 'app-slide-toggle',
  imports: [],
  templateUrl: './slide-toggle.html',
  styleUrl: './slide-toggle.scss',
  host: {
    'class': 'app-slide-toggle'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SlideToggle),
      multi: true,
    }
  ]
})
export class SlideToggle implements ControlValueAccessor {

  private static _id = 1;
  protected readonly _id = 'app-slide-toggle-id-' + SlideToggle._id++;

  private _checked!: boolean;
  private _isDisabled = false;

  setDisabledState?(isDisabled: boolean) {
    this._isDisabled = isDisabled;
  };

  @Input('checked')
  set checked(value: boolean) {
    this._checked = value;
  }

  get checked() {
    return this._checked;
  }

  public onChange = (_: any) => {
  };

  public onTouched = () => {
  };

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(obj: any): void {
    this.checked = obj;
  }

  _onChange($event: Event) {
    $event.stopPropagation();

    if (this._isDisabled) return;

    this.onChange(($event.target as HTMLInputElement).checked);
  }

  _onClick($event: MouseEvent) {

    $event.stopPropagation();

    if (this._isDisabled) return;

    this.checked = !this.checked;
    this.onChange(this.checked);
  }

  _onTouched() {
    this.onTouched();
  }
}
