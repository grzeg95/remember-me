import {Directive} from '@angular/core';

@Directive()
export abstract class ChipGroup {

  // @ts-ignore
  registerInput: (chipInputFor: ChipInputFor) => void;
}
