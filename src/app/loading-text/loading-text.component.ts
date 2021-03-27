import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, interval, Subscription} from 'rxjs';

@Component({
  selector: 'app-loading-text',
  templateUrl: './loading-text.component.html',
  styleUrls: ['./loading-text.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoadingTextComponent implements OnInit, OnDestroy {

  dots$: BehaviorSubject<string> = new BehaviorSubject<string>('...');
  cnt = 0;
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(interval(333).subscribe(() => {
      switch (this.cnt) {
        case 0: this.dots$.next('...'); break;
        case 1: this.dots$.next('<span class="invisible-dots">.</span>..'); break;
        case 2: this.dots$.next('<span class="invisible-dots">..</span>.'); break;
        case 3: this.dots$.next('<span class="invisible-dots">...</span>'); break;
        case 4: this.dots$.next('.<span class="invisible-dots">..</span>'); break;
        case 5: this.dots$.next('..<span class="invisible-dots">.</span>'); break;
      }
      if (this.cnt === 5) {
        this.cnt = 0;
      } else {
        this.cnt++;
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
