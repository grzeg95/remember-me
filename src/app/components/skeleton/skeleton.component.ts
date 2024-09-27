import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-skeleton'
  }
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
  }

  ngOnInit(): void {
    this._applySize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this._applySize();
  }
}
