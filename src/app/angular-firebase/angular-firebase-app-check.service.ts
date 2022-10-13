import {Inject, Injectable} from '@angular/core';
import {getToken} from '@firebase/app-check';
import {AppCheck} from 'firebase/app-check';
import {defer, map, Observable} from 'rxjs';
import {APP_CHECK} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseAppCheckService {

  constructor(
    @Inject(APP_CHECK) private readonly appCheck: AppCheck,
  ) {
  }

  getToken(forceRefresh?: boolean): Observable<string> {
    return defer(() => getToken(this.appCheck, forceRefresh)).pipe(map((token) => token.token));
  }
}
