import {Injectable} from '@angular/core';
import {Functions, httpsCallableFromURL} from '@angular/fire/functions';
import {environment} from 'environment';
import {defer} from 'rxjs';
import {AngularFirebaseRemoteConfigService} from './angular-firebase-remote-config.service';

@Injectable()
export class AngularFirebaseFunctionsService {

  constructor(
    private functions: Functions,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService
  ) {
  }

  httpsCallable<RequestData = unknown, RespondData = unknown>(name: string) {
    return (data: RequestData) => {
      return defer(() => {

        let url = this.angularFirebaseRemoteConfigService.getString(name);

        if (!environment.production) {
          url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/${environment.functionsRegionOrCustomDomain}/${url}`;
        }

        return httpsCallableFromURL<RequestData, RespondData>(this.functions, url)(data)
          .then((res) => res.data);
      });
    }
  }
}
