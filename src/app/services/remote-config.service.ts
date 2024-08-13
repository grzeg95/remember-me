import {Inject, Injectable} from '@angular/core';
import {Functions} from 'firebase/functions';
import {getString, getValue, RemoteConfig} from 'firebase/remote-config';
import {FunctionsInjectionToken, RemoteConfigInjectionToken} from '../models/firebase';

@Injectable()
export class RemoteConfigService {

  constructor(
    @Inject(RemoteConfigInjectionToken) private readonly _remoteConfig: RemoteConfig,
  ) {
  }

  getString(key: string) {
    return getString(this._remoteConfig, key);
  }

  getValue<T>(key: string) {
    try {
      return JSON.parse(getValue(this._remoteConfig, key).asString()) as T;
    } catch (e) {
      return undefined;
    }
  }
}
