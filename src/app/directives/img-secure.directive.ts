import {HttpClient} from '@angular/common/http';
import {Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges} from '@angular/core';
import {switchMap} from 'rxjs';

@Directive({
  selector: '[imgSecure]'
})
export class ImgSecureDirective implements OnChanges {

  @Input() imgSecure: string;

  constructor(
    private imageElementElementRef: ElementRef<HTMLImageElement>,
    private renderer: Renderer2,
    private http: HttpClient
  ) {
    this.renderer.setStyle(this.imageElementElementRef.nativeElement, 'opacity', 0);
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes.imgSecure.currentValue !== changes.imgSecure.previousValue) {
      if (changes.imgSecure.currentValue) {
        this.applyImgChange(changes.imgSecure.currentValue);
      } else {
        this.renderer.setAttribute(this.imageElementElementRef.nativeElement, 'src', '');
        this.renderer.setStyle(this.imageElementElementRef.nativeElement, 'opacity', 1);
      }
    }
  }

  private applyImgChange(imgSecure: string) {
    if (imgSecure.startsWith('data:image')) {
      this.http.get(imgSecure, {
        headers: {
          'cache-control': 'private, max-age=0'
        },
        responseType: 'blob'
      }).pipe(
        switchMap((blob) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();

            reader.readAsDataURL(blob);
            reader.onload = () => {
              resolve(reader.result as string);
            }
          });
        })
      ).subscribe((src) => {
        this.renderer.setAttribute(this.imageElementElementRef.nativeElement, 'src', src);
        this.renderer.setStyle(this.imageElementElementRef.nativeElement, 'opacity', 1);
      });
    } else {
      this.renderer.setAttribute(this.imageElementElementRef.nativeElement, 'src', imgSecure);
      this.renderer.setStyle(this.imageElementElementRef.nativeElement, 'opacity', 1);
    }
  }
}
