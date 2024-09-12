import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {effect, Inject, Injectable, PLATFORM_ID, Renderer2, RendererFactory2} from '@angular/core';
import {Firestore, updateDoc} from 'firebase/firestore';
import {User} from '../models/user';
import {FirestoreInjectionToken} from '../models/firebase';
import {Sig} from '../utils/Sig';
import {AuthService} from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeSelectorService {

  private readonly _renderer: Renderer2;
  readonly darkModeSig = new Sig<boolean | undefined>(undefined);
  private readonly _user = this._authService.userSig.get();

  constructor(
    private readonly _rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private readonly _document: Document,
    @Inject(PLATFORM_ID) private readonly _platformId: NonNullable<unknown>,
    private readonly _authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore
  ) {
    this._renderer = this._rendererFactory.createRenderer(null, null);

    let userDarkMode: boolean | null;
    effect(() => {

      const user = this._user();

      if (!user) {
        return;
      }

      if (userDarkMode === user.darkMode) {
        return;
      }
      userDarkMode = user.darkMode;

      if (userDarkMode === null) {
        return;
      }

      if (!userDarkMode) {
        this.setLight();
      } else {
        this.setDark();
      }
    });
  }

  setLight() {

    const isBrowser = isPlatformBrowser(this._platformId);

    this._renderer.removeClass(this._document.body, 'dark');
    this._renderer.addClass(this._document.body, 'light');

    if (isBrowser) {
      localStorage.setItem('theme', 'light');
    }

    this.darkModeSig.set(false);

    const user = this._user();

    if (user && user.darkMode !== null && user.darkMode) {
      const userRef = User.ref(this._firestore, user.id);

      updateDoc(userRef, {
        darkMode: false
      });
    }
  }

  setDark() {

    const isBrowser = isPlatformBrowser(this._platformId);

    this._renderer.removeClass(this._document.body, 'light');
    this._renderer.addClass(this._document.body, 'dark');

    if (isBrowser) {
      localStorage.setItem('theme', 'dark');
    }

    this.darkModeSig.set(true);

    const user = this._user();

    if (user && !user.darkMode) {
      const userRef = User.ref(this._firestore, user.id);

      updateDoc(userRef, {
        darkMode: true
      });
    }
  }

  loadTheme() {

    const isBrowser = isPlatformBrowser(this._platformId);

    if (isBrowser) {

      const storedTheme = localStorage.getItem('theme');

      if (storedTheme === 'light' || storedTheme === 'dark') {

        switch (storedTheme) {
          case 'light':
            this.setLight();
            break;
          case 'dark':
            this.setDark();
            break;
        }

      } else {

        let theme: 'dark' | 'light' = 'dark';

        const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;

        if (!isLightMode) {
          theme = 'light';
        }

        switch (theme) {
          case 'light':
            this.setLight();
            break;
          case 'dark':
            this.setDark();
            break;
        }
      }

    } else {
      this.setDark();
    }
  }
}
