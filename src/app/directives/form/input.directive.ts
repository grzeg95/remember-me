import {Directive, ElementRef, inject} from '@angular/core';
import {NgControl} from '@angular/forms';

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: {
    '(focus)': '_focusChanged(true)',
    '(blur)': '_focusChanged(false)',
    '[id]': 'id'
  }
})
export class InputDirective {

  private static _id = 0;
  id = 'InputDirective' + InputDirective._id++;
  protected _elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  isFocused = false;
  ngControl = inject(NgControl, {optional: true, self: true})!;

  get value() {
    return this._elementRef.nativeElement.value;
  }

  get invalid() {
    return this.ngControl?.invalid;
  }

  get untouched() {
    return this.ngControl?.untouched;
  }

  _focusChanged(focus: boolean) {
    this.isFocused = focus;
  }
}
