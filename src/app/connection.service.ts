import {EventEmitter, Inject, Injectable, InjectionToken, OnDestroy, Optional} from '@angular/core';
import {fromEvent, Observable, Subscription, timer} from 'rxjs';
import {debounceTime, delay, retryWhen, startWith, switchMap, tap} from 'rxjs/operators';
import * as _ from 'lodash';
import { HttpClient } from '@angular/common/http';
import {environment} from '../environments/environment';

export interface ConnectionState {
  /**
   * "True" if browser has network connection. Determined by Window objects "online" / "offline" events.
   */
  hasNetworkConnection: boolean;
  /**
   * "True" if browser has Internet access. Determined by heartbeat system which periodically makes request to heartbeat Url.
   */
  hasInternetAccess: boolean;
}

export interface ConnectionServiceOptions {
  enableHeartbeat?: boolean;
  heartbeatUrl?: string;
  heartbeatInterval?: number;
  heartbeatRetryInterval?: number;
}

/**
 * InjectionToken for specifing ConnectionService options.
 */
export const ConnectionServiceOptionsToken: InjectionToken<ConnectionServiceOptions> = new InjectionToken('ConnectionServiceOptionsToken');

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {

  /**
   * Current ConnectionService options. Notice that changing values of the returned object has not effect on service execution.
   * You should use "updateOptions" function.
   */
  get options(): ConnectionServiceOptions {
    return _.clone(this.serviceOptions);
  }

  constructor(
    private http: HttpClient,
    @Inject(ConnectionServiceOptionsToken) @Optional() options: ConnectionServiceOptions
  ) {
    this.serviceOptions = _.defaults({}, options, ConnectionService.DEFAULT_OPTIONS);

    this.checkNetworkState();
    this.checkInternetState();
  }

  private stateChangeEventEmitter = new EventEmitter<ConnectionState>();

  private currentState: ConnectionState = {
    hasInternetAccess: false,
    hasNetworkConnection: window.navigator.onLine
  };
  private offlineSubscription: Subscription;
  private onlineSubscription: Subscription;
  private httpSubscription: Subscription;
  private serviceOptions: ConnectionServiceOptions;

  private checkInternetState(): void {

    if (!environment.production) {
      return;
    }

    if (!_.isNil(this.httpSubscription)) {
      this.httpSubscription.unsubscribe();
    }

    if (this.serviceOptions.enableHeartbeat) {
      this.httpSubscription = timer(0, this.serviceOptions.heartbeatInterval)
        .pipe(
          switchMap(() => this.http.head(this.serviceOptions.heartbeatUrl)),
          retryWhen(errors =>
            errors.pipe(
              // log error message
              tap(val => {
                console.error('Http error:', val);
                this.currentState.hasInternetAccess = false;
                this.emitEvent();
              }),
              // restart after 5 seconds
              delay(this.serviceOptions.heartbeatRetryInterval)
            )
          )
        )
        .subscribe(() => {
          this.currentState.hasInternetAccess = true;
          this.emitEvent();
        });
    } else {
      this.currentState.hasInternetAccess = false;
      this.emitEvent();
    }
  }

  private checkNetworkState(): void {
    this.onlineSubscription = fromEvent(window, 'online').subscribe(() => {
      this.currentState.hasNetworkConnection = true;
      this.checkInternetState();
      this.emitEvent();
    });

    this.offlineSubscription = fromEvent(window, 'offline').subscribe(() => {
      this.currentState.hasNetworkConnection = false;
      this.checkInternetState();
      this.emitEvent();
    });
  }

  private emitEvent(): void {
    this.stateChangeEventEmitter.emit(this.currentState);
  }

  ngOnDestroy(): void {
    this.offlineSubscription.unsubscribe();
    this.onlineSubscription.unsubscribe();
    this.httpSubscription.unsubscribe();
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

  /**
   * Update options of the service. You could specify partial options object. Values that are not specified will use default / previous
   * option values.
   * @param options Partial option values.
   */
  updateOptions(options: Partial<ConnectionServiceOptions>): void {
    this.serviceOptions = _.defaults({}, options, this.serviceOptions);
    this.checkInternetState();
  }

  private static DEFAULT_OPTIONS: ConnectionServiceOptions = {
    enableHeartbeat: true,
    heartbeatUrl: 'https://www.rem.grzeg.pl/',
    heartbeatInterval: 30000,
    heartbeatRetryInterval: 1000
  };
}
