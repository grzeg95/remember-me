import {Directive} from '@angular/core';

@Directive()
export abstract class FormFieldControl<T> {

  // @ts-ignore
  readonly ngControl: NgControl | null;

  // @ts-ignore
  readonly focused: boolean;

  // @ts-ignore
  readonly disabled: boolean;

  // @ts-ignore
  readonly hasError: boolean;

  // @ts-ignore
  readonly shouldLabelFloat: boolean;

  // @ts-ignore
  focus: () => void;
}
