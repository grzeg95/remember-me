import {Component, inject, input, TemplateRef, ViewChild, ViewContainerRef} from '@angular/core';

@Component({
  selector: 'app-loader-defer',
  imports: [],
  templateUrl: './loader-defer.html',
  styleUrl: './loader-defer.scss'
})
export class LoaderDefer {

  private _viewContainerRef = inject(ViewContainerRef);
  when = input.required<boolean>();
  @ViewChild(TemplateRef, {static: true}) template!: TemplateRef<any>;

  show() {
    this._viewContainerRef.createEmbeddedView(this.template);
  }
}
