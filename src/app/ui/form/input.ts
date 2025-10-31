import {Directive, DoCheck, ElementRef, inject, Input as _Input} from '@angular/core';
import {NgControl} from '@angular/forms';
import {FormFieldControl} from './form-field/form-field-control';

@Directive({
  selector: '[appInput]',
  providers: [{
    provide: FormFieldControl, useExisting: Input
  }],
  standalone: true,
  host: {
    '(focusin)': 'focused = true',
    '(blur)': 'focused = false'
  }
})
export class Input implements FormFieldControl, DoCheck {

  private static _id = 0;

  id = 'Input-' + (Input._id++);

  private readonly _elementRef = inject<ElementRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>(ElementRef);

  private readonly _ngControl = inject(NgControl, {optional: true, self: true})!;

  private _focused = false;

  @_Input()
  set disabled(disabled: boolean | null) {

    this._disabled = disabled === null ? false : disabled;

    if (this.focused && this._disabled) {
      this.focused = false;
    }
  }

  get disabled() {
    return this._disabled;
  }

  private _disabled = false;

  get labelShouldFloat(): boolean {
    return (this.focused && !this.disabled) || !this.empty;
  }

  get empty() {
    return !this._elementRef.nativeElement.value;
  }

  ngDoCheck() {
    if (this._ngControl) {
      this.disabled = this._ngControl.disabled;
    }
  }

  focus() {
    this._elementRef.nativeElement.focus();
  }

  set focused(focused: boolean) {
    this._focused = focused;
  }

  get focused() {
    return this._focused;
  }

  get invalid() {
    return this._ngControl ? this._ngControl.invalid : undefined;
  }

  get touched() {
    return this._ngControl ? this._ngControl.touched : undefined;
  }
}
