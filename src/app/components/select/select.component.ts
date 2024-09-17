import {CdkMenuTrigger} from '@angular/cdk/menu';
import {CdkConnectedOverlay, CdkOverlayOrigin} from '@angular/cdk/overlay';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {SvgDirective} from '../../../directives/svg.directive';
import {PopMenuItemComponent} from '../../pop-menu/pop-menu-item/pop-menu-item.component';
import {PopMenuItem} from '../../pop-menu/pop-menu-item/pop-menu-item.model';
import {PopMenuComponent} from '../../pop-menu/pop-menu.component';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [
    SvgDirective,
    PopMenuComponent,
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    CdkMenuTrigger,
    PopMenuItemComponent
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-select'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    }
  ]
})
export class SelectComponent implements ControlValueAccessor, OnChanges, AfterViewInit {

  private static _id = 1;
  protected readonly _id = 'app-select-id-' + SelectComponent._id++;

  @ViewChild('trigger') protected _trigger!: CdkOverlayOrigin;

  @Input() placeholder = '';
  @Input() items: PopMenuItem[] = [];
  @Input() value = '';
  @Input() withHint = false;

  @HostBinding('style.margin-bottom.px')
  get marginBottom() {
    return this.withHint ? 32 : 11;
  }

  @HostBinding('class.app-select--disabled') @Input() disabled!: boolean;
  protected _selected: PopMenuItem | undefined;
  protected _itemsOpened = false;

  protected _appPopMenuItemWidth = signal(0);

  @HostListener('window:resize')
  onResize() {
    this._appPopMenuItemWidth.set(this._trigger.elementRef.nativeElement.getBoundingClientRect().width);
  }

  constructor(
    private readonly _cdr: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['value']) {
      this._onChange(changes['value'].currentValue);
    }
  }

  ngAfterViewInit(): void {
    this.onResize();
  }

  onChange = (_: any) => {
  };

  onTouched = () => {
  };

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
    this._itemsOpened = false;
    this._cdr.detectChanges();
  }

  writeValue(value: string): void {
    this.value = value;
    this._updateView();
  }

  _onTouched() {
    this.onTouched();
  }

  _onChange(value: string) {
    this._itemsOpened = false;
    this.onChange(value);
    this.writeValue(value);
  }

  private _updateView(): void {
    if (this.items) {
      for (const item of this.items) {
        if (this.value === item.value) {
          this._selected = item;
          this._cdr.detectChanges();
          break;
        }
      }
    }
  }
}
