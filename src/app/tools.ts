import {NgZone} from '@angular/core';
import {Observable, OperatorFunction} from 'rxjs';

export const runInZone = <T>(ngZone: NgZone): OperatorFunction<T, T> => {
  return (source) => {
    return new Observable<T>((observer) => {
      const onNext = (value?: T) => ngZone.run(() => observer.next(value));
      const onError = (e: any) => ngZone.run(() => observer.error(e));
      const onComplete = () => ngZone.run(() => observer.complete());
      return source.subscribe(onNext, onError, onComplete);
    });
  };
}
