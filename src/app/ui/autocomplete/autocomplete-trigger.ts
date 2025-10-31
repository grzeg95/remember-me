import {
  ConnectedPosition,
  createRepositionScrollStrategy,
  Overlay,
  OverlayConfig,
  OverlayRef,
  PositionStrategy,
  ScrollStrategy
} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';
import {DOCUMENT} from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  Injector,
  Input,
  ViewContainerRef
} from '@angular/core';
import {fromEvent, merge, Observable, startWith, Subscription, switchMap} from 'rxjs';
import {filter} from 'rxjs/operators';
import {FORM_FIELD} from '../form/form-field/form-field';
import {Autocomplete} from './autocomplete';

export const APP_AUTOCOMPLETE_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>(
  'app-autocomplete-scroll-strategy',
  {
    providedIn: 'root',
    factory: () => {
      const injector = inject(Injector);
      return () => createRepositionScrollStrategy(injector);
    },
  },
);

@Directive({
  selector: 'input[appAutocomplete]',
  standalone: true,
  host: {
    '(click)': '_openAutocompleteOverlay()',
    '(focus)': '_openAutocompleteOverlay()'
  }
})
export class AutocompleteTrigger {

  @Input('appAutocomplete') autocomplete?: Autocomplete;

  private _viewContainerRef = inject(ViewContainerRef);
  private _overlay = inject(Overlay);
  private _overlayRef?: OverlayRef;
  private _element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private _document = inject(DOCUMENT);
  private _outsideClickStreamSub?: Subscription;
  private _formField = inject(FORM_FIELD);
  private _autocompleteOptionsChangeSub?: Subscription;
  private _mutationObserverBody?: MutationObserver;
  private _scrollStrategy = inject(APP_AUTOCOMPLETE_SCROLL_STRATEGY);

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this._overlayRef?.updatePosition();
    this._overlayRef?.updateSize({
      width: this._getWidth()
    });
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (event.code === 'Tab') {
      this._closeAutocompleteOverlay();
    }
  }

  private _getPositionStrategy() {

    const positionStrategy = this._overlay
      .position()
      .flexibleConnectedTo(this._formField.triggerHandler() || this._element)
      .withFlexibleDimensions(false)
      .withPush(false);

    const belowPositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top'},
      {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top'},
    ];

    const abovePositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom'},
      {originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom'},
    ];

    positionStrategy.withPositions([...belowPositions, ...abovePositions]);

    return positionStrategy;
  }

  private _getOverlayConfig(positionStrategy: PositionStrategy) {

    return new OverlayConfig({
      positionStrategy: positionStrategy,
      scrollStrategy: this._scrollStrategy(),
      width: this._getWidth()
    });
  }

  protected _openAutocompleteOverlay() {

    const overlayRef = this._overlayRef;

    if (this.autocomplete && !overlayRef?.hasAttached()) {

      const portal = new TemplatePortal(this.autocomplete.template, this._viewContainerRef);
      const positionStrategy = this._getPositionStrategy();
      const overlayConfig = this._getOverlayConfig(positionStrategy);
      this._overlayRef = this._overlay.create(overlayConfig);
      this._overlayRef.attach(portal);

      this._outsideClickStreamSub = this._getOutsideClickStream().subscribe((event) => {
        this._closeAutocompleteOverlay();
      });

      this._autocompleteOptionsChangeSub = this.autocomplete?.options?.changes.pipe(
        startWith(null),
        switchMap(() => merge(...this.autocomplete!.options!.map(option => option.onSelectionChange))),
      ).subscribe(optionComponent => {
        this.autocomplete?.optionSelected.emit({
          source: this.autocomplete,
          option: optionComponent
        });
        this._closeAutocompleteOverlay();
      });

      this._createMutationBodyObserver();
    }
  }

  private _getWidth() {
    return (this._formField.triggerHandler() || this._element).nativeElement.getBoundingClientRect().width;
  }

  private _createMutationBodyObserver() {

    this._mutationObserverBody = new MutationObserver(() => {
      this._overlayRef?.updatePosition();
      this._overlayRef?.updateSize({
        width: this._getWidth()
      });
    });

    this._mutationObserverBody.observe(this._document.querySelector('body')!, {
      subtree: true,
      childList: true,
    });
  }

  private _disconnectMutationBodyObserver() {
    this._mutationObserverBody?.disconnect();
    this._mutationObserverBody = undefined;
  }

  private _closeAutocompleteOverlay() {

    const overlayRef = this._overlayRef;

    if (overlayRef && overlayRef.hasAttached()) {
      overlayRef.detach();
      this._outsideClickStreamSub?.unsubscribe();
      this._autocompleteOptionsChangeSub?.unsubscribe();
      this._disconnectMutationBodyObserver();
    }
  }

  private _getOutsideClickStream() {
    return merge(
      fromEvent(this._document, 'click') as Observable<MouseEvent>,
      fromEvent(this._document, 'auxclick') as Observable<MouseEvent>,
      fromEvent(this._document, 'touchend') as Observable<TouchEvent>,
    ).pipe(
      filter((event) => {

        const target = event.target as HTMLElement;

        const formField = this._formField
          ? this._formField.triggerHandler()?.nativeElement
          : null;

        return (
          (!formField || !formField.contains(target)) &&
          target !== this._element.nativeElement &&
          !!this._overlayRef && !this._overlayRef.overlayElement.contains(target)
        );

      })
    );
  }
}
