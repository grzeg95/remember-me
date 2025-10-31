import {DOCUMENT, inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Auth} from './auth';

@Injectable({
  providedIn: 'root'
})
export class Theme {

  private readonly _document = inject(DOCUMENT);
  private readonly _auth = inject(Auth);

   isDarkMode$ = new BehaviorSubject<boolean>(false);

  constructor() {

    this._auth.firestoreUser$.subscribe((user) => {
      if (user) {
        this.setTheme(user.isDarkMode ?? this.isDarkMode$.value);
      }
    });
  }

  toggleTheme() {
    this.setTheme(!this.isDarkMode$.value);
  }

  setTheme(isDarkMode: boolean) {

    this.isDarkMode$.next(isDarkMode);

    if (isDarkMode) {
      this._document.documentElement.setAttribute('data-theme','dark');
      localStorage.setItem('isDarkMode', 'true');
    } else {
      this._document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('isDarkMode', 'false');
    }
  }
}
