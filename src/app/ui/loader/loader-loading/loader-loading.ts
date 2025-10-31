import {Component, inject, input, TemplateRef, ViewChild, ViewContainerRef} from '@angular/core';

@Component({
  selector: 'app-loader-loading',
  imports: [],
  templateUrl: './loader-loading.html',
  styleUrl: './loader-loading.scss'
})
export class LoaderLoading {

  private _viewContainerRef = inject(ViewContainerRef);
  after = input.required<number>();
  minimum = input.required<number>();
  @ViewChild(TemplateRef, {static: true}) template!: TemplateRef<any>;

  hide() {
    this._viewContainerRef.clear();
  }

  show() {
    this._viewContainerRef.createEmbeddedView(this.template);
  }
}
