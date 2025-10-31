export interface ChipTextControl {
  empty: boolean;
  value: any;
  focused: boolean;
  labelShouldFloat: boolean;
  focus: () => void;
  disabled: boolean;
}
