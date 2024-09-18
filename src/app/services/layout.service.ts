import {BreakpointObserver} from '@angular/cdk/layout';
import {Injectable, TemplateRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Breakpoints, BreakpointsDevices} from '../models/breakpoints';
import {Sig} from '../utils/sig';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  readonly showNavMenuLoginSig = new Sig<boolean>(false);
  readonly popUpView = new Sig<boolean>(false);

  readonly closePopUpButtonRefSig = new Sig<TemplateRef<any> | null>(null);

  private readonly _displayNameMap = new Map([
    [Breakpoints[BreakpointsDevices.extraSmall].selector, BreakpointsDevices.extraSmall],
    [Breakpoints[BreakpointsDevices.small].selector, BreakpointsDevices.small],
    [Breakpoints[BreakpointsDevices.medium].selector, BreakpointsDevices.medium],
    [Breakpoints[BreakpointsDevices.large].selector, BreakpointsDevices.large],
    [Breakpoints[BreakpointsDevices.extraLarge].selector, BreakpointsDevices.extraLarge]
  ]);

  readonly isOnExtraSmallSig = new Sig(false);
  readonly isOnSmallSig = new Sig(false);
  readonly isOnMediumSig = new Sig(false);
  readonly isOnLargeSig = new Sig(false);
  readonly isOnExtraLargeSig = new Sig(false);

  constructor(
    private _breakpointObserver: BreakpointObserver
  ) {

    this._breakpointObserver.observe([
      Breakpoints[BreakpointsDevices.extraSmall].selector,
      Breakpoints[BreakpointsDevices.small].selector,
      Breakpoints[BreakpointsDevices.medium].selector,
      Breakpoints[BreakpointsDevices.large].selector,
      Breakpoints[BreakpointsDevices.extraLarge].selector
    ]).pipe(
      takeUntilDestroyed()
    ).subscribe((result) => {

      for (const query of Object.keys(result.breakpoints)) {
        if (result.breakpoints[query]) {

          const breakpointsDevice = this._displayNameMap.get(query);

          this.isOnExtraSmallSig.set(false);
          this.isOnSmallSig.set(false);
          this.isOnMediumSig.set(false);
          this.isOnLargeSig.set(false);
          this.isOnExtraLargeSig.set(false);

          if (breakpointsDevice === BreakpointsDevices.extraSmall) {
            this.isOnExtraSmallSig.set(true);
          }

          if (breakpointsDevice === BreakpointsDevices.small) {
            this.isOnSmallSig.set(true);
          }

          if (breakpointsDevice === BreakpointsDevices.medium) {
            this.isOnMediumSig.set(true);
          }

          if (breakpointsDevice === BreakpointsDevices.large) {
            this.isOnLargeSig.set(true);
          }

          if (breakpointsDevice === BreakpointsDevices.extraLarge) {
            this.isOnExtraLargeSig.set(true);
          }
        }
      }
    });
  }
}
