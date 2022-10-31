import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  AngularFirebaseAppCheckService,
  AngularFirebaseAuthService,
  AngularFirebaseRemoteConfigService
} from 'angular-firebase';
import {FirebaseUser} from 'auth';
import {environment} from 'environment';
import {catchError, forkJoin, map, Observable, switchMap} from 'rxjs';
import {HTTPError} from '../user/models';

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

    return (data: RequestData, firebaseUser: FirebaseUser, forceRefresh = false): Observable<RespondData> => {

      let url = this.angularFirebaseRemoteConfigService.getString(name);

      if (!environment.production) {
        url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/${environment.functionsRegionOrCustomDomain}/${url}`;
      }

      return forkJoin([
        this.angularFirebaseAuthService.getAuthorizationToken(firebaseUser, forceRefresh),
        this.angularFirebaseAppCheckService.getToken(forceRefresh)
      ]).pipe(
        switchMap(([authorization, appCheckToken]) => {

          const headers = {
            'Content-Type': contentType,
            'authorization': authorization,
            'X-Firebase-AppCheck': appCheckToken
          };

          return this.http.post<{result: RespondData}>(url, data, {headers}).pipe(map((r) => r.result)).pipe(
            catchError((error: HTTPError) => {
              if (error.code === 'permission-denied' && !forceRefresh) {
                return this.httpsOnRequest<RequestData, RespondData>(name, contentType)(data, firebaseUser, true);
              }
              throw error;
            })
          );
        })
      );
    };
  }
}
