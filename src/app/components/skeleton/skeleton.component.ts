import {Component, ElementRef, Input, OnChanges, OnInit, Renderer2, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss'
})
export class SkeletonComponent implements OnChanges, OnInit {

  @Input() width = '50px';
  @Input() height = '50px';

  constructor(
    private readonly _host: ElementRef<HTMLElement>,
    private readonly _rendered: Renderer2
  ) {
  }

  private _applySize() {

    this._rendered.setStyle(this._host.nativeElement, 'max-width', this.width);
    this._rendered.setStyle(this._host.nativeElement, 'height', this.height);

    // this._host.nativeElement.style.width = this.width;
    // this._host.nativeElement.style.height = this.height;

    // console.log(this._host.nativeElement.style.width, this._host.nativeElement.style.height);
  }

  ngOnInit(): void {
    this._applySize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this._applySize();
  }
}
