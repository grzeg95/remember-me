import {signal} from '@angular/core';

export class Sig<T> {

  private readonly _sig;

  set(value: T | undefined) {
    setTimeout(() => this._sig.set(value));
  }

  update(fn: (value: T | undefined) => T | undefined) {
    setTimeout(() => this._sig.update(fn));
  }

  get() {
    return this._sig.asReadonly();
  }

  constructor(
    private readonly value?: T
  ) {
    this._sig = signal<T | undefined>(value);
  }
}
