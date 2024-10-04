import {AsyncPipe, NgClass} from '@angular/common';
import {AfterViewInit, Component, forwardRef, HostBinding, Injector, Input, ViewEncapsulation} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, NgControl} from '@angular/forms';
import {BehaviorSubject, combineLatest, map} from 'rxjs';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [
    NgClass,
    AsyncPipe
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

  protected _value$ = new BehaviorSubject<string>('');

  protected _inputFocused$ = new BehaviorSubject<boolean>(false);
  protected _errors$ = new BehaviorSubject<{ [key in string]: string } | null>(null);

  protected _placeholderActive$ = this._inputFocused$.pipe(
    map((inputFocused) => {
      const label = this.label;
      return inputFocused || !label;
    })
  );

  protected _labelActive$ = combineLatest([
    this._inputFocused$,
    this._value$
  ]).pipe(
    map(([inputFocused, value]) => {
      return inputFocused || value.length;
    })
  )

  @Input() placeholder = '';
  @Input() label: string | undefined;
  @Input() type: 'text' | 'password' | 'email' = 'text';

  @HostBinding('class.app-input--disabled') @Input() disabled!: boolean;


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
    this._value$.next(value);
  }

  protected _onFocus() {
    this._inputFocused$.next(true);
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

    this._errors$.next((this.control?.touched && this.control?.errors) || null);
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

    this._errors$.next((this.control?.touched && this.control?.errors) || null);
  }

  protected _onTouched() {
    this.onTouched();
    this._inputFocused$.next(false);
    this._errors$.next((this.control?.touched && this.control?.errors) || null);
  }
}
