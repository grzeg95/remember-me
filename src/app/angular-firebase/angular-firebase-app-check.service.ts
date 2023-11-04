import {Injectable} from '@angular/core';
import {AppCheck, getToken} from '@angular/fire/app-check';
import {defer, map, Observable} from 'rxjs';

@Injectable()
export class AngularFirebaseAppCheckService {

  constructor(
    private appCheck: AppCheck
  ) {
  }

  getToken(forceRefresh?: boolean): Observable<string> {
    return defer(() => getToken(this.appCheck, forceRefresh)).pipe(map((token) => token.token));
  }
}
