import {Directive, HostListener, inject, InjectionToken} from '@angular/core';
import {Chip} from '../chip/chip';

export const APP_CHIP_REMOVE = new InjectionToken<ChipRemove>('AppChipRemove');

@Directive({
  selector: '[appChipRemove]',
  standalone: true,
  host: {},
  providers: [
    {provide: APP_CHIP_REMOVE, useExisting: ChipRemove}
  ]
})
export class ChipRemove {

  private readonly _chip = inject(Chip);

  @HostListener('click', ['$event'])
  _handleClick($event: MouseEvent) {
    $event.preventDefault();
    $event.stopPropagation();
    this._chip.remove();
  }
}
