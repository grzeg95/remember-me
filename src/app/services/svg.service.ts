import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {map, tap} from 'rxjs';
import {SanitizerService} from './sanitizer.service';

@Injectable({
  providedIn: 'root'
})
export class SvgService {

  private readonly _svgs = new Map<string, SVGElement>();

  getSvg(name: string) {
    return this._svgs.get(name);
  }

  constructor(
    private readonly _http: HttpClient,
    private readonly _sanitizer: SanitizerService
  ) {}

  registerSvg(name: string, src: string) {
    return this._http.get(src, {responseType: 'text'}).pipe(
      map((text) => {
        return this._sanitizer.sanitize(text);
      }),
      tap((text) => {

        const template = document.createElement('template');
        template.innerHTML = text;

        const svg = template.content.childNodes.item(0) as SVGElement;

        if (!svg) {
          throw 'empty svg file';
        }

        this._svgs.set(name, svg);
      })
    );
  }
}
