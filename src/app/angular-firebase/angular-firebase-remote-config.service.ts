import {Injectable} from '@angular/core';
import {getString, getValue, RemoteConfig} from '@angular/fire/remote-config';

@Injectable()
export class AngularFirebaseRemoteConfigService {

  constructor(
    private remoteConfig: RemoteConfig
  ) {
  }

  getString(key: string) {
    return getString(this.remoteConfig, key);
  }

  getValue<T>(key: string) {
    try {
      return JSON.parse(getValue(this.remoteConfig, key).asString()) as T;
    } catch (e) {
      return undefined;
    }
  }
}
