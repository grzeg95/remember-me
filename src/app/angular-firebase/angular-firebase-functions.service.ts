import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  AngularFirebaseAppCheckService,
  AngularFirebaseAuthService,
  AngularFirebaseRemoteConfigService
} from 'angular-firebase';
import {FirebaseUser} from 'auth';
import {environment} from 'environment';
import {forkJoin, map, Observable, switchMap} from 'rxjs';

@Injectable()
export class AngularFirebaseFunctionsService {

  constructor(
    private angularFirebaseAppCheckService: AngularFirebaseAppCheckService,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService,
    private http: HttpClient
  ) {
  }

  httpsOnRequest<RequestData = unknown, RespondData = unknown>(name: string, contentType: string = 'application/json') {

    return (data: RequestData, firebaseUser: FirebaseUser): Observable<RespondData> => {

      let url = this.angularFirebaseRemoteConfigService.getString(name);

      if (!environment.production) {
        url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/${environment.functionsRegionOrCustomDomain}/${url}`;
      }

      return forkJoin([
        this.angularFirebaseAuthService.getAuthorizationToken(firebaseUser, false),
        this.angularFirebaseAppCheckService.getToken(false)
      ]).pipe(
        switchMap(([authorization, appCheckToken]) => {

          const headers = {
            'Content-Type': contentType,
            'authorization': authorization,
            'X-Firebase-AppCheck': appCheckToken
          };

          return this.http.post<{result: RespondData}>(url, data, {headers}).pipe(map((r) => r.result));
        })
      );
    };
  }
}
