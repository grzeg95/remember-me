import {EventEmitter, Injectable, OnDestroy} from '@angular/core';
import {fromEvent, Observable, Subscription} from 'rxjs';
import {debounceTime, startWith} from 'rxjs/operators';

export interface ConnectionState {
  /**
   * "True" if browser has network connection. Determined by Window objects "online" / "offline" events.
   */
  hasNetworkConnection: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {

  constructor() {
    this.checkNetworkState();
  }

  private stateChangeEventEmitter = new EventEmitter<ConnectionState>();

  private currentState: ConnectionState = {
    hasNetworkConnection: window.navigator.onLine
  };
  private offlineSubscription: Subscription;
  private onlineSubscription: Subscription;

  private checkNetworkState(): void {
    this.onlineSubscription = fromEvent(window, 'online').subscribe(() => {
      this.currentState.hasNetworkConnection = true;
      this.emitEvent();
    });

    this.offlineSubscription = fromEvent(window, 'offline').subscribe(() => {
      this.currentState.hasNetworkConnection = false;
      this.emitEvent();
    });
  }

  private emitEvent(): void {
    console.log(this.currentState);
    this.stateChangeEventEmitter.emit(this.currentState);
  }

  ngOnDestroy(): void {
    this.offlineSubscription.unsubscribe();
    this.onlineSubscription.unsubscribe();
  }

  /**
   * Monitor Network & Internet connection status by subscribing to this observer. If you set "reportCurrentState" to "false" then
   * function will not report current status of the connections when initially subscribed.
   * @param reportCurrentState Report current state when initial subscription. Default is "true"
   */
  monitor(reportCurrentState: boolean = true): Observable<ConnectionState> {
    return reportCurrentState ?
      this.stateChangeEventEmitter.pipe(
        debounceTime(300),
        startWith(this.currentState),
      )
      :
      this.stateChangeEventEmitter.pipe(
        debounceTime(300)
      );
  }
}
