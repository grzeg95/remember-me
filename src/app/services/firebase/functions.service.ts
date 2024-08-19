import {Inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';
import {defer} from 'rxjs';
import {FunctionsInjectionToken} from '../../models/firebase';

@Injectable({
  providedIn: 'root'
})
export class FunctionsService {

  constructor(
    @Inject(FunctionsInjectionToken) private readonly _functions: Functions
  ) {
  }

  httpsCallable<RequestData = unknown, ResponseData = unknown>(name: string, data: RequestData) {
    return defer(
      () => httpsCallable<RequestData, ResponseData>(this._functions, name)(data)
        .then((res) => res.data)
    );
  }
}
