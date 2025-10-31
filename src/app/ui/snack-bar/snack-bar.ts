import {Overlay, OverlayConfig, OverlayRef, PositionStrategy} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {ComponentRef, inject, Injectable, InjectionToken, Injector} from '@angular/core';
import {SnackBarContainer} from './snack-bar-container';

export type SnackBarOptions = {
  duration?: number;
  horizontalPosition?: 'start' | 'center' | 'end';
  verticalPosition?: 'top' | 'bottom';
  closable?: boolean;
};

export type SnackBarConfig = {
  data: {
    message: string;
    closeable?: boolean;
  }
}

export const SNACK_BAR_DATA = new InjectionToken<{
  message: string;
  closeable?: boolean;
}>('SnackBarData');

@Injectable({
  providedIn: 'root'
})
export class SnackBar {

  private _overlay = inject(Overlay);
  private _overlayRef?: OverlayRef;
  private _injector = inject(Injector);
  private _snackBarContainerComponentRef?: ComponentRef<SnackBarContainer>;
  private _setTimeoutCloseId?: number;

  open(message: string, options?: SnackBarOptions) {

    this.close();
    clearTimeout(this._setTimeoutCloseId);

    const defaultSnackBarOptions: SnackBarOptions = {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      closable: true
    };

    const snackBarOptions = {...defaultSnackBarOptions, ...options};

    const positionStrategy = this._getPositionStrategy(snackBarOptions);
    const overlayConfig = this._getOverlayConfig(positionStrategy);
    this._overlayRef = this._overlay.create(overlayConfig);

    const injector = this._createInjector({data: {message, closeable: snackBarOptions.closable}}, this._overlayRef);
    const portal = new ComponentPortal(SnackBarContainer, undefined, injector);
    this._snackBarContainerComponentRef = this._overlayRef.attach(portal);

    if (snackBarOptions.duration !== Infinity) {
      this._setTimeoutCloseId = setTimeout(() => {
        this.close();
      }, snackBarOptions.duration);
    }
  }

  close() {
    this._snackBarContainerComponentRef?.instance.dismiss();
  }

  private _getPositionStrategy(snackBarOptions: SnackBarOptions) {

    let positionStrategy = this._overlay.position().global();

    if (snackBarOptions.verticalPosition === 'top') {
      positionStrategy = positionStrategy.top('20px');
    } else if (snackBarOptions.verticalPosition === 'bottom') {
      positionStrategy = positionStrategy.bottom('20px');
    }

    if (snackBarOptions.horizontalPosition === 'start') {
      positionStrategy = positionStrategy.start('20px');
    } else if (snackBarOptions.horizontalPosition === 'end') {
      positionStrategy = positionStrategy.start('20px');
    } else if (snackBarOptions.horizontalPosition === 'center') {
      positionStrategy = positionStrategy.centerHorizontally();
    }

    return positionStrategy;
  }

  private _getOverlayConfig(positionStrategy: PositionStrategy) {

    return new OverlayConfig({
      positionStrategy: positionStrategy,
      hasBackdrop: false
    });
  }

  private _createInjector<T>(config: SnackBarConfig, overlayRef: OverlayRef | undefined): Injector {

    return Injector.create({
      parent: this._injector,
      providers: [
        {provide: OverlayRef, useValue: overlayRef},
        {provide: SNACK_BAR_DATA, useValue: config.data},
      ],
    });
  }
}
