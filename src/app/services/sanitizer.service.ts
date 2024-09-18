import {Injectable} from '@angular/core';
import DOMPurify from 'dompurify';

@Injectable({
  providedIn: 'root'
})
export class SanitizerService {

  sanitize(text: string) {
    return DOMPurify.sanitize(text);
  }
}
