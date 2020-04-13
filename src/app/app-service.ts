import {Injectable} from '@angular/core';
import {ConnectionService} from 'ng-connection-service';
import {BehaviorSubject} from 'rxjs';

@Injectable()
export class AppService {

  dialogOpen = false;
  isConnected$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  constructor(private connectionService: ConnectionService) {
    this.connectionService.monitor().subscribe((isConnected) =>
      this.isConnected$.next(isConnected)
    );
  }

  hasScrollbar(): boolean {

    // The Modern solution
    if (typeof window.innerWidth === 'number') {
      return window.innerWidth > document.documentElement.clientWidth;
    }

    // rootElem for quirksmode
    const rootElem = document.documentElement || document.body;

    // Check overflow style property on body for fauxscrollbars
    let overflowStyle;

    if (typeof rootElem.style !== 'undefined') {
      overflowStyle = rootElem.style.overflow;
    }

    overflowStyle = overflowStyle || window.getComputedStyle(rootElem, '').overflow;

    // Also need to check the Y axis overflow
    let overflowYStyle;

    if (typeof rootElem.style !== 'undefined') {
      overflowYStyle = rootElem.style.overflowY;
    }

    overflowYStyle = overflowYStyle || window.getComputedStyle(rootElem, '').overflowY;

    const contentOverflows = rootElem.scrollHeight > rootElem.clientHeight;
    const overflowShown = /^(visible|auto)$/.test(overflowStyle) || /^(visible|auto)$/.test(overflowYStyle);
    const alwaysShowScroll = overflowStyle === 'scroll' || overflowYStyle === 'scroll';

    return (contentOverflows && overflowShown) || (alwaysShowScroll);
  }

}
