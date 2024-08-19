import {RemoteConfig, getValue as _getValue} from 'firebase/remote-config';

export function getValue<T>(remoteConfig: RemoteConfig, key: string): T | undefined {
  try {
    return JSON.parse(_getValue(remoteConfig, key).asString()) as T;
  } catch (e) {
    return undefined;
  }
}
