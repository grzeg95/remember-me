import {
  Component,
  computed,
  contentChild,
  ElementRef,
  InjectionToken, input,
  viewChild,
  ViewEncapsulation
} from '@angular/core';
import {Label} from '../label/label';
import {FormFieldControl} from './form-field-control';

export const FORM_FIELD = new InjectionToken<FormField>('FormField');

@Component({
  selector: 'app-form-field',
  imports: [],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
  host: {
    'class': 'app-form-field'
  },
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  providers: [
    {provide: FORM_FIELD, useExisting: FormField}
  ]
})
export class FormField {

  triggerHandler = viewChild<ElementRef<HTMLElement>>('triggerHandler');

  protected _label = contentChild(Label);
  protected _hasLabel = computed(() => !!this._label());

  protected _control = contentChild(FormFieldControl);

  protected get _shouldLabelFloat() {

    if (!this._hasLabel()) {
      return false;
    }

    return !!this._control()?.labelShouldFloat;
  }

  protected _controlId() {
    return this._control()?.id;
  }

  protected get _focused() {
    return this._control()?.focused;
  }

  protected get _disabled() {
    return this._control()?.disabled;
  }

  protected get _isPlaceholderVisible() {
    return !this._label() || this._shouldLabelFloat;
  }

  protected _controlFocus() {
    this._control()?.focus?.();
  }
}
