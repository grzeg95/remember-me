import {Component, OnDestroy, OnInit} from '@angular/core';
import {faEdit, faListAlt, faChartBar} from '@fortawesome/free-regular-svg-icons';
import {faTachometerAlt, faListOl, faProjectDiagram, faSort, faCarBattery} from '@fortawesome/free-solid-svg-icons';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {AngularFirePerformance} from '@angular/fire/compat/performance';
import firebase from 'firebase/compat';
import Trace = firebase.performance.Trace;

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent implements OnInit, OnDestroy {

  private guestComponentTrace: Promise<Trace | void>;

  constructor(private perf: AngularFirePerformance) {
  }

  faEdit = faEdit;
  faListAlt = faListAlt;
  faListOl = faListOl;
  faProjectDiagram = faProjectDiagram;
  faSort = faSort;
  faGoogle = faGoogle;
  faTachometerAlt = faTachometerAlt;
  faChartBar = faChartBar;
  faCarBattery = faCarBattery;

  ngOnInit(): void {
    this.guestComponentTrace = this.perf.trace('GuestComponent').then((e) => e && e.start());
  }

  ngOnDestroy(): void {
    this.guestComponentTrace.then((e) => e && e.stop());
  }
}
