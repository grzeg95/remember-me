import {HttpClient} from '@angular/common/http';
import {Directive, ElementRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {switchMap} from 'rxjs';

@Directive({
  selector: '[imgSecure]'
})
export class ImgSecureDirective implements OnChanges {

  @Input() imgSecure: string;

  constructor(
    private imageElementElementRef: ElementRef<HTMLImageElement>,
    private http: HttpClient
  ) {
    this.imageElementElementRef.nativeElement.style.opacity = '0';
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes.imgSecure.currentValue !== changes.imgSecure.previousValue) {
      if (changes.imgSecure.currentValue) {
        this.applyImgChange(changes.imgSecure.currentValue);
      } else {
        this.imageElementElementRef.nativeElement.style.opacity = '1';
        this.imageElementElementRef.nativeElement.src = '';
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
        this.imageElementElementRef.nativeElement.src = src;
        this.imageElementElementRef.nativeElement.style.opacity = '1';
      });
    } else {
      this.imageElementElementRef.nativeElement.src = imgSecure;
      this.imageElementElementRef.nativeElement.style.opacity = '1';
    }
  }
}
