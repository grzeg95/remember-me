import {Component, ContentChildren, EventEmitter, Output, QueryList, TemplateRef, ViewChild} from '@angular/core';
import {Option} from '../option/option';

export type AutocompleteSelectedEvent = {
  source: Autocomplete,
  option: Option
}

@Component({
  selector: 'app-autocomplete',
  imports: [],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
  standalone: true,
  exportAs: 'autocomplete'
})
export class Autocomplete {
  @ContentChildren(Option, {descendants: true}) options?: QueryList<Option>;
  @ViewChild(TemplateRef, {static: true}) template!: TemplateRef<any>;
  @Output() optionSelected = new EventEmitter<AutocompleteSelectedEvent>();
}
