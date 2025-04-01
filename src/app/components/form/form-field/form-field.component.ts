import {Component, ContentChild, ElementRef, inject, InjectionToken, ViewChild, ViewEncapsulation} from '@angular/core';
import {InputDirective} from '../../../directives/form/input.directive';

export const APP_FORM_FIELD = new InjectionToken<FormFieldComponent>('FormFieldComponent');

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  host: {},
  providers: [
    {provide: APP_FORM_FIELD, useExisting: FormFieldComponent}
  ],
  encapsulation: ViewEncapsulation.None
})
export class FormFieldComponent {

  @ContentChild(InputDirective) inputDirective?: InputDirective;
  element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  @ViewChild('triggerHandler') triggerHandler!: ElementRef<HTMLInputElement>;

  get id() {
    return this.inputDirective?.id;
  }
}
