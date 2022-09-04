import {Inject, Injectable} from '@angular/core';
import {getString, RemoteConfig, getValue} from 'firebase/remote-config';
import {REMOTE_CONFIG} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseRemoteConfigService {

  constructor(
    @Inject(REMOTE_CONFIG) private readonly remoteConfig: RemoteConfig
  ) {
  }

  getString(key: string) {
    return getString(this.remoteConfig, key);
  }

  getValue(key: string) {
    return getValue(this.remoteConfig, key);
  }
}
