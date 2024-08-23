import {animate, style, transition, trigger} from '@angular/animations';

export const fadeZoomInOutTrigger = trigger(
  'fadeZoomInOutTrigger',
  [
    transition(
      ':enter', [
        style({ opacity: .95, transform: 'scale(.99)' }),
        animate('0.1s', style({ opacity: 1, transform: 'scale(1)' })),
      ]
    ),
    transition(
      ':leave', [
        style({ opacity: 1, transform: 'scale(1)' }),
        animate('0.1s', style({ opacity: 0, transform: 'scale(.99)' })),
      ]
    ),
  ])
