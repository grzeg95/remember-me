import {
  Component,
  computed,
  contentChild,
  ElementRef,
  InjectionToken,
  input,
  viewChild,
  ViewEncapsulation
} from '@angular/core';
import {ErrorDirective, FormFieldControl, LabelDirective} from './directives';

export const APP_FORM_FIELD = new InjectionToken<FormFieldComponent>('FormFieldComponent');

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'app-form-field'
  },
  providers: [
    {provide: APP_FORM_FIELD, useExisting: FormFieldComponent}
  ],
})
export class FormFieldComponent {

  floatLabel = input<'always' | 'none'>('none');

  private readonly _labelChild = contentChild(LabelDirective);
  private readonly _formFieldControl = contentChild(FormFieldControl);
  private readonly _error = contentChild(ErrorDirective);

  protected _hasFloatingLabel = computed(() => !!this._labelChild());
  protected _hasSubscript = computed(() => !!this._error());

  triggerHandler = viewChild<ElementRef<HTMLInputElement>>('triggerHandler');

  protected get _shouldLabelFloat() {
    return this._formFieldControl()?.shouldLabelFloat || this.floatLabel() === 'always';
  }

  protected get _focused() {
    return this._formFieldControl()?.focused;
  }

  protected get _hasError() {
    return this._formFieldControl()?.hasError;
  }

  protected get _disabled() {
    return this._formFieldControl()?.disabled;
  }

  protected _focus() {
    this._formFieldControl()?.focus?.();
  }
}
