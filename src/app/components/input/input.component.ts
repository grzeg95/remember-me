import {NgClass} from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  forwardRef,
  HostBinding,
  Injector,
  Input,
  signal,
  ViewEncapsulation
} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, NgControl} from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-input'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    }
  ]
})
export class InputComponent implements ControlValueAccessor, AfterViewInit {

  protected _inputFocused = signal<boolean>(false);
  protected _errors = signal<{ [key in string]: string } | null>(null);

  protected _placeholderActive = computed(() => {

    const label = this.label;
    const inputFocused = this._inputFocused();

    return inputFocused || !label;
  });

  protected _labelActive = computed(() => {

    const value = this.value;
    const inputFocused = this._inputFocused();

    return inputFocused || value.length;
  });

  @Input({required: true}) placeholder!: string;
  @Input() label: string | undefined;
  @Input() removeAble = false;
  @Input() withHint = false;

  @HostBinding('class.app-input--disabled') @Input() disabled!: boolean;
  value = '';

  private control: FormControl | undefined;

  constructor(
    private readonly _injector: Injector
  ) {
  }

  ngAfterViewInit(): void {

    const ngControl = this._injector.get(NgControl, null);

    if (ngControl) {
      setTimeout(() => {
        this.control = ngControl.control as FormControl;
      })
    }
  }

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

  protected _onFocus() {
    this._inputFocused.set(true);
  }

  protected _onChange($event: Event) {

    $event.stopPropagation();

    if (this.disabled) {
      $event.preventDefault();
      return;
    }

    const value = ($event.target as HTMLInputElement).value;

    this.onChange(value);
    this.writeValue(value);

    this._errors.set((this.control?.touched && this.control?.errors) || null);
  }

  protected _onInput($event: Event) {

    $event.stopPropagation();

    if (this.disabled) {
      $event.preventDefault();
      return;
    }

    const value = ($event.target as HTMLInputElement).value;

    this.onChange(value);
    this.writeValue(value);

    this._errors.set((this.control?.touched && this.control?.errors) || null);
  }

  protected _onTouched() {
    this.onTouched();
    this._inputFocused.set(false);
    this._errors.set((this.control?.touched && this.control?.errors) || null);
  }
}
