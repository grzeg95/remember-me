import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {AngularFirebaseRemoteConfigService} from 'angular-firebase';
import {map, Observable} from 'rxjs';
import {environment} from 'environment';

@Injectable()
export class FunctionsService {

  constructor(
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService,
    private http: HttpClient
  ) {
  }

  httpsOnRequest<RequestData = unknown, RespondData = unknown>(name: string, contentType: string = 'application/json') {

    return (data: RequestData, authorization?: string): Observable<RespondData> => {

      let url = this.angularFirebaseRemoteConfigService.getString(name);

      if (!environment.production) {
        url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/${environment.functionsRegionOrCustomDomain}/${url}`;
      }

      const headers = {
        'Content-Type': contentType,
        'authorization': authorization
      };

      return this.http.post<{result: RespondData}>(url, data, {headers}).pipe(map((r) => r.result));
    }
  }
}
