import {DOCUMENT} from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {environment} from '../environments/environment';
import {AppService} from './app-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  host: { class: 'app' }
})
export class AppComponent implements AfterViewChecked, OnInit {

  isConnected = true;
  scrollY: number;
  scrollX: number;
  html: HTMLElement;

  @ViewChild('overlay', {static: true}) overlay: ElementRef;
  @ViewChild('overlaySpan', {static: true}) overlaySpan: ElementRef;

  constructor(private cdRef: ChangeDetectorRef,
              private appService: AppService,
              @Inject(DOCUMENT) private document: Document,
              private renderer: Renderer2,
              private snackBar: MatSnackBar) {

    this.html = this.document.documentElement;

    if (environment.production) {
      console.log = () => {};
    }
  }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {

    this.appService.$isConnected.subscribe((isConnected) => {

      if (!this.isConnected && isConnected) {

        setTimeout(() => {
          console.log('show');

          if (!this.appService.dialogOpen) {
            this.renderer.removeAttribute(this.html, 'style');
            this.renderer.removeClass(this.html, 'cdk-global-scrollblock');
            this.html.scrollTop = this.scrollY;
            this.html.scrollLeft = this.scrollX;
          }

          this.renderer.removeClass(this.overlay.nativeElement, 'colors');
          this.renderer.removeClass(this.overlaySpan.nativeElement, 'colors');
        });

      } else if (!isConnected) {

        console.log('hide');

        if (!this.appService.dialogOpen) {
          this.scrollY = scrollY;
          this.scrollX = scrollX;

          this.renderer.setStyle(this.html, 'top', -this.scrollY + 'px');
          this.renderer.setStyle(this.html, 'left', -this.scrollX + 'px');
          this.renderer.addClass(this.html, 'cdk-global-scrollblock');
        }

        setTimeout(() => {
          this.renderer.addClass(this.overlay.nativeElement, 'colors');
          this.renderer.addClass(this.overlaySpan.nativeElement, 'colors');
        });

      }

      this.isConnected = isConnected;

    });

  }

}
