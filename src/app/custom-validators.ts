import {FormControl, ValidatorFn} from '@angular/forms';

export class CustomValidators {
  static maxRequired(val: number): ValidatorFn {
    return (c: FormControl): {maxRequired: boolean} | null => {

      const current = c.value as string;
      const trimLeft = (c.value as string).trimStart();

      if (current.length !== trimLeft.length) {
        c.setValue(trimLeft);
      }

      return (typeof c.value === 'string') && (c.value.trim().length > 0) && (c.value.trim().length < val) ? null : {maxRequired: true};
    }
  }

  static equalsToOtherFormControl(otherFormControl: FormControl): ValidatorFn {
    return (c: FormControl): {notEquals: boolean} | null => {
      return c.value === otherFormControl.value ? null : {notEquals: true};
    }
  }
}
