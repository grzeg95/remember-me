import {Inject, Injectable} from '@angular/core';
import {Functions, httpsCallable, httpsCallableFromURL, HttpsCallableOptions} from 'firebase/functions';
import {from, map, Observable} from 'rxjs';
import {FUNCTIONS} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseFunctionsService {

  constructor(
    @Inject(FUNCTIONS) private readonly functions: Functions,
  ) {
  }

  httpsCallable<RequestData = unknown, ResponseData = unknown>(name: string, options?: HttpsCallableOptions): (data?: RequestData | null) => Observable<ResponseData> {
    const callable = httpsCallable<RequestData, ResponseData>(this.functions, name, options);
    return (data) => from(callable(data)).pipe(map((r) => r.data));
  }

  httpsCallableFromURL<RequestData = unknown, ResponseData = unknown>(name: string, options?: HttpsCallableOptions): (data?: RequestData | null) => Observable<ResponseData> {
    const callable = httpsCallableFromURL<RequestData, ResponseData>(this.functions, name, options);
    return (data) => from(callable(data)).pipe(map((r) => r.data));
  }
}
