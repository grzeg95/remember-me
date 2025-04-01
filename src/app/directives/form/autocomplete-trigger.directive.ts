import {Directionality} from '@angular/cdk/bidi';
import {ConnectedPosition, Overlay, OverlayConfig, OverlayRef, PositionStrategy} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';
import {DOCUMENT} from '@angular/common';
import {Directive, ElementRef, HostListener, inject, Input, ViewContainerRef} from '@angular/core';
import {fromEvent, merge, Observable, startWith, Subscription, switchMap} from 'rxjs';
import {filter} from 'rxjs/operators';
import {AutocompleteComponent} from '../../components/form/autocomplete/autocomplete.component';
import {APP_FORM_FIELD} from '../../components/form/form-field/form-field.component';

@Directive({
  selector: 'input[appAutocomplete]',
  standalone: true,
  host: {
    '(click)': 'openAutocompleteOverlay()',
    '(focus)': 'openAutocompleteOverlay()'
  }
})
export class AutocompleteTriggerDirective {

  @Input('appAutocomplete') autocomplete?: AutocompleteComponent;

  private _viewContainerRef = inject(ViewContainerRef);
  private _overlay = inject(Overlay);
  private _overlayRef?: OverlayRef;
  private _element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private _dir = inject(Directionality, {optional: true});
  private _document = inject(DOCUMENT);
  private _outsideClickStreamSub?: Subscription;
  private _appFormFieldComponent = inject(APP_FORM_FIELD);
  private _autocompleteOptionsChangeSub?: Subscription;

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (event.code === 'Tab') {
      this.closeAutocompleteOverlay();
    }
  }

  constructor() {
  }

  private _getPositionStrategy() {
    const positionStrategy = this._overlay
      .position()
      .flexibleConnectedTo(this._appFormFieldComponent.triggerHandler || this._element)
      .withFlexibleDimensions(false)
      .withPush(false);

    const belowPositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top'},
      {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top'},
    ];

    positionStrategy.withPositions(belowPositions);

    return positionStrategy;
  }

  private _getOverlayConfig(positionStrategy: PositionStrategy) {

    return new OverlayConfig({
      positionStrategy: positionStrategy,
      width: (this._appFormFieldComponent.triggerHandler || this._element).nativeElement.getBoundingClientRect().width,
      direction: this._dir ?? undefined,
    });
  }

  openAutocompleteOverlay() {

    const overlayRef = this._overlayRef;

    if (this.autocomplete && !overlayRef?.hasAttached()) {
      const portal = new TemplatePortal(this.autocomplete.template, this._viewContainerRef);
      const positionStrategy = this._getPositionStrategy();
      const overlayConfig = this._getOverlayConfig(positionStrategy);
      this._overlayRef = this._overlay.create(overlayConfig);
      this._overlayRef.attach(portal);

      this._outsideClickStreamSub = this._getOutsideClickStream().subscribe((event) => {
        this.closeAutocompleteOverlay();
      });

      this._autocompleteOptionsChangeSub = this.autocomplete?.options?.changes.pipe(
        startWith(null),
        switchMap(() => merge(...this.autocomplete!.options!.map(option => option.onSelectionChange))),
      ).subscribe(changeValue => {
        this.autocomplete?.selectionChange.emit(changeValue);
        this.closeAutocompleteOverlay();
      });
    }
  }

  closeAutocompleteOverlay() {

    const overlayRef = this._overlayRef;

    if (overlayRef && overlayRef.hasAttached()) {
      overlayRef.detach();
      this._outsideClickStreamSub?.unsubscribe();
      this._autocompleteOptionsChangeSub?.unsubscribe();
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

        return (
          target !== this._element.nativeElement &&
          !!this._overlayRef && !this._overlayRef.overlayElement.contains(target)
        );

      })
    );
  }
}
