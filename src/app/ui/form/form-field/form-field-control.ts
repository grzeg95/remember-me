import {Directive} from '@angular/core';

@Directive()
export abstract class FormFieldControl {
  id!: string;
  labelShouldFloat!: boolean;
  focused: boolean | undefined;
  focus: (() => void) | undefined;
  invalid: boolean | null | undefined;
  touched: boolean | null | undefined;
  disabled: boolean | null | undefined;
}
