import {Component} from '@angular/core';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-loading-text',
  template: '<span [innerHTML]="loadingText$ | async"></span>'
})
export class LoadingTextComponent {

  loadingText$ = new Observable<string>((subscriber) => {

    const getLoadingText = (cnt: number) => {

      let text = '';

      switch (cnt) {
        case 0: text = '<span class="invisible-text"></span>...'; break;
        case 1: text = '<span class="invisible-text">.</span>..'; break;
        case 2: text = '<span class="invisible-text">..</span>.'; break;
        case 3: text = '<span class="invisible-text">...</span>'; break;
        case 4: text = '.<span class="invisible-text">..</span>'; break;
        case 5: text = '..<span class="invisible-text">.</span>'; break;
      }

      return 'Loading ' + text;
    };

    let cnt = 0;
    subscriber.next(getLoadingText(cnt));

    const intervalId = setInterval(() => {
      subscriber.next(getLoadingText(cnt));
      cnt = cnt === 5 ? 0 : cnt + 1;
    }, 333);

    return function unsubscribe() {
      clearInterval(intervalId);
    };
  });
}
