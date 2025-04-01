import {Component, ContentChildren, EventEmitter, Output, QueryList, TemplateRef, ViewChild} from '@angular/core';
import {OptionComponent} from '../../option/option.component';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
  exportAs: 'appAutocomplete'
})
export class AutocompleteComponent {

  @ContentChildren(OptionComponent, {descendants: true}) options?: QueryList<OptionComponent>;
  @ViewChild(TemplateRef, {static: true}) template!: TemplateRef<any>;
  @Output() selectionChange = new EventEmitter<unknown>();
}
