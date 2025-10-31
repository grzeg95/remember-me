import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export function equalsToOtherFormControl(otherFormControl: AbstractControl<any, any>): ValidatorFn {
  return (c: AbstractControl<any, any>): ValidationErrors | null => {
    return c.value === otherFormControl.value ? null : {notEquals: true};
  }
}
