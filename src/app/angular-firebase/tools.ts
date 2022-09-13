import {NgZone} from '@angular/core';
import {Observable, OperatorFunction} from 'rxjs';

export const runInZone = <T>(ngZone: NgZone): OperatorFunction<T, T> => {
  return (source) => {
    return new Observable<T>((observer) => {
      return source.subscribe({
        next: (value?: T) => ngZone.run(() => observer.next(value)),
        error: (e: any) => ngZone.run(() => observer.error(e)),
        complete: () => ngZone.run(() => observer.complete())
      });
    });
  };
}
