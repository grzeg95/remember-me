import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit, faListAlt} from '@fortawesome/free-regular-svg-icons';
import {faListOl, faProjectDiagram, faSort} from '@fortawesome/free-solid-svg-icons';
import {performance} from 'firebase';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.sass'],
  host: {class: 'app'}
})
export class GuestComponent implements OnInit, OnDestroy {

  perf = performance();
  guestComponentTrace = this.perf.trace('GuestComponent');

  faEdit = faEdit;
  faListAlt = faListAlt;
  faListOl = faListOl;
  faProjectDiagram = faProjectDiagram;
  faSort = faSort;

  ngOnInit(): void {
    this.guestComponentTrace.start();
  }

  ngOnDestroy(): void {
    this.guestComponentTrace.stop();
  }
}
