import {AfterContentInit, Component, contentChild, effect} from '@angular/core';
import {LoaderDefer} from './loader-defer/loader-defer';
import {LoaderLoading} from './loader-loading/loader-loading';

@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.html',
  styleUrl: './loader.scss'
})
export class Loader implements AfterContentInit {

  private _loadingTimeout?: ReturnType<typeof setTimeout>;
  private _minSkeletonTimeout?: ReturnType<typeof setTimeout>;

  private readonly _defer = contentChild(LoaderDefer);
  private readonly _loading = contentChild(LoaderLoading);

  constructor() {

    effect(() => {

      const when = this._defer()?.when();

      if (when) {
        clearTimeout(this._loadingTimeout);

        if (!this._minSkeletonTimeout) {
          this._defer()?.show();
          this._loading()?.hide();
        }
      }
    });
  }

  ngAfterContentInit(): void {

    if (this._loading() && this._defer()?.when() === false) {

      this._loadingTimeout = setTimeout(() => {

        this._loading()?.show();

        if (this._defer()?.when() === false) {

          this._minSkeletonTimeout = setTimeout(() => {
            this._minSkeletonTimeout = undefined;

            if (this._defer()?.when()) {
              this._defer()?.show();
              this._loading()?.hide();
            }

          }, this._loading()?.minimum() || 0);
        }
      }, this._loading()?.after() || 0);
    }
  }
}
