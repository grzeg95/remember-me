import {OverlayRef} from '@angular/cdk/overlay';
import {AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewEncapsulation} from '@angular/core';
import {SNACK_BAR_DATA} from './snack-bar';

@Component({
  selector: 'app-snack-bar-container',
  imports: [],
  templateUrl: './snack-bar-container.html',
  styleUrl: './snack-bar-container.scss',
  host: {
    'class': 'app-snack-bar-container',
    '[class.app-snack-bar-container-enter]': '_animationState === "visible"',
    '[class.app-snack-bar-container-exit]': '_animationState === "hidden"',
  },
  encapsulation: ViewEncapsulation.None
})
export class SnackBarContainer implements OnInit {

  protected _animationState = 'void';

  private readonly _overlayRef = inject(OverlayRef);
  private readonly _cdr = inject(ChangeDetectorRef);

  private readonly _snackBarData = inject(SNACK_BAR_DATA);
  protected readonly _message = this._snackBarData.message;
  protected readonly _closeable = this._snackBarData.closeable;

  ngOnInit(): void {
    setTimeout(() => {
      this._animationState = 'visible';
      this._cdr.markForCheck();
    });
  }

  dismiss() {
    this._animationState = 'hidden';
    this._cdr.markForCheck();
    setTimeout(() => {
      this._overlayRef.dispose();
    }, 300);
  }
}
