import {Component} from '@angular/core';
import {faEdit, faListAlt} from '@fortawesome/free-regular-svg-icons';
import {faListOl, faProjectDiagram, faSort} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.sass'],
  host: {class: 'app'}
})
export class GuestComponent {
  faEdit = faEdit;
  faListAlt = faListAlt;
  faListOl = faListOl;
  faProjectDiagram = faProjectDiagram;
  faSort = faSort;
}
