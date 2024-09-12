export enum BreakpointsDevices {
  extraSmall = 'Extra small',
  small = 'small',
  medium = 'medium',
  large = 'large',
  extraLarge = 'extraLarge'
}

export const BreakpointsMin = {
  [BreakpointsDevices.extraSmall]: 0,
  [BreakpointsDevices.small]: 576,
  [BreakpointsDevices.medium]: 768,
  [BreakpointsDevices.large]: 992,
  [BreakpointsDevices.extraLarge]: 1200
};

export const Breakpoints = {
  [BreakpointsDevices.extraSmall]: {
    selector: `(min-width: 0) and (max-width: ${BreakpointsMin.small - 1}px)`,
  },
  [BreakpointsDevices.small]: {
    selector: `(min-width: ${BreakpointsMin.small}px) and (max-width: ${BreakpointsMin.medium - 1}px)`,
  },
  [BreakpointsDevices.medium]: {
    selector: `(min-width: ${BreakpointsMin.medium}px) and (max-width: ${BreakpointsMin.large - 1}px)`,
  },
  [BreakpointsDevices.large]: {
    selector: `(min-width: ${BreakpointsMin.large}px) and (max-width: ${BreakpointsMin.extraLarge - 1}px)`,
  },
  [BreakpointsDevices.extraLarge]: {
    selector: `(min-width: ${BreakpointsMin.extraLarge}px)`
  }
};
