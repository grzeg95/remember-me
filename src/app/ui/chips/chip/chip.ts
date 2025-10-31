import {
  Component,
  computed,
  contentChild,
  EventEmitter,
  HostListener,
  input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {APP_CHIP_REMOVE} from '../directives/chip-remove';

export interface ChipEvent {
  chip: Chip;
  value?: string;
}

@Component({
  selector: 'app-chip',
  exportAs: 'appChip',
  templateUrl: 'chip.html',
  styleUrl: 'chip.scss',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'app-chip'
  }
})
export class Chip {

  @HostListener('click', ['$event'])
  _handleOnClick($event: MouseEvent) {
    $event.stopPropagation();
    $event.preventDefault();
  }

  _removeButton = contentChild(APP_CHIP_REMOVE);
  _hasRemoveButton = computed(() => !!this._removeButton());

  @Output() readonly removed: EventEmitter<ChipEvent> = new EventEmitter<ChipEvent>();

  value = input<string>();
  removable = input<boolean>(false);

  remove() {

    if (this.removable()) {
      this.removed.emit({
        chip: this,
        value: this.value()
      });
    }
  }
}
