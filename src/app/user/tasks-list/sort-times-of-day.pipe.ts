import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'sortTimesOfDay'
})
export class SortTimesOfDayPipe implements PipeTransform {

  transform(timesOfDay: string[], order: string[]): any {
    const timesOfDayOrder = [];

    order.forEach((timeOfDay) => {
      if (timesOfDay.includes(timeOfDay)) {
        timesOfDayOrder.push(timeOfDay);
      }
    });

    return timesOfDayOrder.length > 0 ? timesOfDayOrder.join(', ') : '';
  }

}
