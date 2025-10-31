import {Directive, ElementRef, EventEmitter, inject, Input, Output} from '@angular/core';
import {NgControl} from '@angular/forms';
import {ChipTextControl} from '../models/chip-text-control';
import {ChipGroup} from './chip-group';

export interface ChipEndEvent {
  value: string;
  chipInput: ChipInputFor;
}

@Directive({
  selector: 'input[appChipInputFor]',
  exportAs: 'appChipInputFor',
  standalone: true,
  host: {
    '(blur)': '_onBlur()',
    '(focus)': 'focused = true',
    '(document:keydown)': '_keyboardDown($event)',
    'class': 'app-chip-input'
  }
})
export class ChipInputFor implements ChipTextControl {

  protected _elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  protected ngControl = inject(NgControl, {optional: true});

  @Input('appChipInputSeparatorKeyCodes')
  separatorKeyCodes: readonly number[] | ReadonlySet<number> | undefined = [13];

  @Input('appChipInputAddOnBlur') addOnBlur: boolean = false;

  @Output('appChipInputTokenEnd') readonly chipEnd: EventEmitter<ChipEndEvent> = new EventEmitter<ChipEndEvent>();

  @Input('appChipInputFor')
  get chipGroup(): ChipGroup {
    return this._chipGroup;
  }

  set chipGroup(value: ChipGroup) {
    if (value) {
      this._chipGroup = value;
      this._chipGroup.registerInput(this);
    }
  }

  private _chipGroup!: ChipGroup;

  get empty(): boolean {
    return !this.value;
  }

  _focused = false;

  get focused(): boolean {
    return this._focused;
  }

  set focused(value: boolean) {
    this._focused = value;
  }

  get disabled() {
    return this._elementRef.nativeElement.disabled;
  }

  get value() {
    return this._elementRef.nativeElement.value;
  }

  get labelShouldFloat() {
    return this.focused || !!this.value;
  }

  protected _keyboardDown($event: KeyboardEvent) {

    if (new Set(this.separatorKeyCodes).has($event.keyCode)) {

      $event.preventDefault()

      if (this.value) {
        this.chipEnd.emit({
          value: this.value,
          chipInput: this
        });
      }
    }
  }

  protected _onBlur() {
    this.focused = false;
    if (this.addOnBlur && this.value) {
      this.chipEnd.emit({
        value: this.value,
        chipInput: this
      });
    }
  }

  clear() {

    const ngControl = this.ngControl;

    if (ngControl) {
      ngControl.reset();
      ngControl.control?.setValue(null);
    } else {
      this._elementRef.nativeElement.value = '';
    }
  }

  focus() {
    this._elementRef.nativeElement.focus();
  }
}
