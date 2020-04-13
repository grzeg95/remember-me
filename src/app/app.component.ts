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

import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthService} from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  host: {class: 'app'}
})
export class AppComponent implements AfterViewChecked, OnInit {

  isConnected = true;
  scrollY: number;
  scrollX: number;
  html: HTMLElement;
  whileLoginIn: boolean;

  @ViewChild('offlineOverlay', {static: true}) offlineOverlay: ElementRef;
  @ViewChild('offlineOverlaySpan', {static: true}) offlineOverlaySpan: ElementRef;

  @ViewChild('whileLoginInOverlay', {static: true}) whileLoginInOverlay: ElementRef;
  @ViewChild('whileLoginInOverlaySpan', {static: true}) whileLoginInOverlaySpan: ElementRef;

  constructor(private cdRef: ChangeDetectorRef,
              private appService: AppService,
              @Inject(DOCUMENT) private document: Document,
              private renderer: Renderer2,
              private authService: AuthService) {

    this.html = this.document.documentElement;

    if (environment.production) {
      console.log = () => {
      };
    }

  }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {

    this.authService.whileLoginIn$.subscribe((whileLoginIn) => {

      if (!this.whileLoginIn && whileLoginIn) {

        if (!this.appService.dialogOpen) {
          this.scrollY = scrollY;
          this.scrollX = scrollX;

          this.renderer.setStyle(this.html, 'top', -this.scrollY + 'px');
          this.renderer.setStyle(this.html, 'left', -this.scrollX + 'px');
          this.renderer.addClass(this.html, 'cdk-global-scrollblock');
        }

        setTimeout(() => {
          this.renderer.addClass(this.whileLoginInOverlay.nativeElement, 'colors');
          this.renderer.addClass(this.whileLoginInOverlaySpan.nativeElement, 'while-login-in-overlay-span');
        });

      } else if (!whileLoginIn) {

        setTimeout(() => {
          console.log('show');

          if (!this.appService.dialogOpen) {
            this.renderer.removeAttribute(this.html, 'style');
            this.renderer.removeClass(this.html, 'cdk-global-scrollblock');
            this.html.scrollTop = this.scrollY;
            this.html.scrollLeft = this.scrollX;
          }

          this.renderer.removeClass(this.offlineOverlay.nativeElement, 'colors');
          this.renderer.removeClass(this.whileLoginInOverlay.nativeElement, 'while-login-in-overlay-span');
        });

      }

      this.whileLoginIn = whileLoginIn;
    });

    this.appService.isConnected$.subscribe((isConnected) => {

      if (!this.isConnected && isConnected) {

        setTimeout(() => {
          console.log('show');

          if (!this.appService.dialogOpen) {
            this.renderer.removeAttribute(this.html, 'style');
            this.renderer.removeClass(this.html, 'cdk-global-scrollblock');
            this.html.scrollTop = this.scrollY;
            this.html.scrollLeft = this.scrollX;
          }

          this.renderer.removeClass(this.offlineOverlay.nativeElement, 'colors');
          this.renderer.removeClass(this.offlineOverlaySpan.nativeElement, 'offline-overlay-span');
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
          this.renderer.addClass(this.offlineOverlay.nativeElement, 'colors');
          this.renderer.addClass(this.offlineOverlaySpan.nativeElement, 'offline-overlay-span');
        });

      }

      this.isConnected = isConnected;

    });

  }

}
