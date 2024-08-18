import {Subscription} from 'rxjs';

export class SubsContainer {

  subs: Subscription[] = [];

  add(sub: Subscription) {
    for (let i = this.subs.length - 1; i >= 0; --i) {
      if (this.subs[i] && this.subs[i].closed) {
        this.subs.pop();
      }
    }
    this.subs.push(sub);
  }

  clear() {
    for (let i = this.subs.length - 1; i >= 0; --i) {
      this.subs.pop();
    }
  }
}
