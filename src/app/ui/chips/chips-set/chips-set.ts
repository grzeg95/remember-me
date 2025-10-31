import {Component, ContentChildren, QueryList, ViewEncapsulation} from '@angular/core';
import {FormFieldControl} from '../../form/form-field/form-field-control';
import {Chip} from '../chip/chip';
import {ChipGroup} from '../directives/chip-group';
import {ChipTextControl} from '../models/chip-text-control';

@Component({
  selector: 'app-chips-set',
  imports: [],
  template: '<ng-content select="app-chip, input"/>',
  styleUrl: './chips-set.scss',
  providers: [
    {provide: FormFieldControl, useExisting: ChipsSet},
    {provide: ChipGroup, useExisting: ChipsSet}
  ],
  host: {
    'class': 'app-chips-set'
  },
  standalone: true,
  encapsulation: ViewEncapsulation.None
})
export class ChipsSet implements ChipGroup {

  @ContentChildren(Chip, {descendants: true}) _chips?: QueryList<Chip>;
  protected _chipInput: ChipTextControl | undefined;

  get empty(): boolean {
    return !this._chips || this._chips.length === 0;
  }

  get labelShouldFloat(): boolean {
    return !this.empty || !!this._chipInput?.labelShouldFloat;
  }

  registerInput(inputElement: ChipTextControl): void {
    this._chipInput = inputElement;
  }

  get focused() {
    return this._chipInput?.focused;
  }

  get disabled() {
    return this._chipInput?.disabled;
  }

  focus(): void {
    this._chipInput?.focus();
  }
}
