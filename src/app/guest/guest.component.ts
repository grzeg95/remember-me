import {Component} from '@angular/core';
import {faEdit, faListAlt} from '@fortawesome/free-regular-svg-icons';
import {faListOl, faProjectDiagram, faSort} from '@fortawesome/free-solid-svg-icons';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  faEdit = faEdit;
  faListAlt = faListAlt;
  faListOl = faListOl;
  faProjectDiagram = faProjectDiagram;
  faSort = faSort;
  faGoogle = faGoogle;

}
