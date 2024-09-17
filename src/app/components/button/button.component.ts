import {NgTemplateOutlet} from '@angular/common';
import {
  AfterViewChecked,
  Component, effect,
  ElementRef,
  HostBinding,
  HostListener, Input,
  input,
  Renderer2, signal, ViewEncapsulation
} from '@angular/core';

type Appearance = 'primary' | 'secondary' | 'warn' | null | undefined;

const HOST_SELECTOR_CLASS_PAIR: {attribute: string; classes: string[]}[] = [
  {
    attribute: 'app-button',
    classes: ['app-button']
  }
];

@Component({
  selector: 'button[app-button]',
  standalone: true,
  imports: [
    NgTemplateOutlet
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ButtonComponent implements AfterViewChecked {

  private readonly _element: HTMLButtonElement;
  private _appearance: Appearance;
  protected readonly _innerText = signal<string>('');
  readonly appearance = input<Appearance | null | undefined>(undefined);
  disabled = input<boolean>(false);
  svg = input<false | 'left' | 'right'>(false);

  @HostListener('click', ['$event'])
  handleOnClick($event: MouseEvent) {
    if (this.disabled()) {
      $event.stopPropagation();
      $event.preventDefault();
    }
  }

  constructor(
    private readonly _elementRef: ElementRef,
    private readonly _renderer: Renderer2
  ) {

    this._element = this._elementRef.nativeElement;

    for (const {attribute, classes} of HOST_SELECTOR_CLASS_PAIR) {
      if (this._element.hasAttribute(attribute)) {
        classes.forEach((_class) => this._renderer.addClass(this._element, _class));
      }
    }

    effect(() => {
      this._element.disabled = this.disabled();
    });

    effect(() => {

      const appearance = this.appearance();

      if (this._appearance) {
        this._renderer.removeClass(this._element, `app-button--${this._appearance}`);
      }

      if (appearance) {
        this._renderer.addClass(this._element, `app-button--${appearance}`);
        this._appearance = appearance;
      }
    });
  }

  ngAfterViewChecked(): void {
    this._innerText.set(this._elementRef.nativeElement.innerText);
  }
}
