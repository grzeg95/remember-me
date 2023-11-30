import {Directive, ElementRef, Input, Renderer2} from '@angular/core';

@Directive({
  selector: '[internalImgSecure]',
  standalone: true
})
export class InternalImgSecureDirective {

  @Input() set internalImgSecure(src: string) {

    if (src.startsWith('data:image')) {
      const headers = new Headers();
      headers.append('cache-control', 'private, max-age=0');

      fetch(src, {headers})
        .then((response) => response.blob())
        .then((blob) =>
          new Promise<string>((resolve) => {
              const reader = new FileReader();

              reader.readAsDataURL(blob);
              reader.onload = () => {
                resolve(reader.result as string);
              }
            }
          ))
        .then((src) => {
          this.setSrc(src);
        });
    } else {
      this.setSrc(src);
    }
  }

  private setSrc(src: string) {
    this.renderer.setAttribute(this.imageElementElementRef.nativeElement, 'src', src);
    this.renderer.removeStyle(this.imageElementElementRef.nativeElement, 'opacity');
  }

  constructor(
    private imageElementElementRef: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {
    this.renderer.setStyle(this.imageElementElementRef.nativeElement, 'opacity', 0);
  }
}
