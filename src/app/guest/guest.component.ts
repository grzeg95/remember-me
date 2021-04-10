import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit, faListAlt} from '@fortawesome/free-regular-svg-icons';
import {faChartArea, faListOl, faProjectDiagram, faSort} from '@fortawesome/free-solid-svg-icons';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {AngularFirePerformance} from '@angular/fire/performance';
import firebase from 'firebase/app';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent implements OnInit, OnDestroy {

  private guestComponentTrace: Promise<firebase.performance.Trace | void>;

  constructor(private perf: AngularFirePerformance) {
  }

  faEdit = faEdit;
  faListAlt = faListAlt;
  faListOl = faListOl;
  faProjectDiagram = faProjectDiagram;
  faSort = faSort;
  faGoogle = faGoogle;
  faChartArea = faChartArea;

  ngOnInit(): void {
    this.guestComponentTrace = this.perf.trace('GuestComponent').then((e) => e && e.start());
  }

  ngOnDestroy(): void {
    this.guestComponentTrace.then((e) => e && e.stop());
  }
}
