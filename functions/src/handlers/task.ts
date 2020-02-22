import {listEqual} from "../tools";

export class Task {

    static timesOfDay = ['atDawn', 'morning', 'beforeNoon', 'atNoon', 'inTheAfternoon', 'beforeEvening', 'inTheEvening', 'inTheNight', 'duringTheDay'];
    static daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    static isValid(task: any) {

        const taskKeys = Object.keys((task as Object));
        const taskDaysOfTheWeekKeys = Object.keys((task.daysOfTheWeek as Object));
        const taskTimesOfDayKeys = Object.keys((task.timesOfDay as Object));

        return (

            taskKeys.length === 3 &&
            listEqual(taskKeys, ['description','daysOfTheWeek','timesOfDay']) &&

            typeof task.description === 'string' && (task.description as string).length >= 4 && (task.description as string).length <= 100 &&

            taskDaysOfTheWeekKeys.length === 7 &&
            listEqual(taskDaysOfTheWeekKeys, ['mon','tue','wed','thu','fri','sat','sun']) &&
            typeof task.daysOfTheWeek.mon === 'boolean' && (task.daysOfTheWeek.mon as boolean) !== null &&
            typeof task.daysOfTheWeek.tue === 'boolean' && (task.daysOfTheWeek.tue as boolean) !== null &&
            typeof task.daysOfTheWeek.wed === 'boolean' && (task.daysOfTheWeek.wed as boolean) !== null &&
            typeof task.daysOfTheWeek.thu === 'boolean' && (task.daysOfTheWeek.thu as boolean) !== null &&
            typeof task.daysOfTheWeek.fri === 'boolean' && (task.daysOfTheWeek.fri as boolean) !== null &&
            typeof task.daysOfTheWeek.sat === 'boolean' && (task.daysOfTheWeek.sat as boolean) !== null &&
            typeof task.daysOfTheWeek.sun === 'boolean' && (task.daysOfTheWeek.sun as boolean) !== null &&
            taskDaysOfTheWeekKeys.some(e => e) && // some true

            taskTimesOfDayKeys.length === 9 &&
            listEqual(taskTimesOfDayKeys, ['atDawn','morning','beforeNoon','atNoon','inTheAfternoon','beforeEvening','inTheEvening','inTheNight','duringTheDay']) &&
            typeof task.timesOfDay.atDawn === 'boolean' && (task.timesOfDay.atDawn as boolean) !== null &&
            typeof task.timesOfDay.morning === 'boolean' && (task.timesOfDay.morning as boolean) !== null &&
            typeof task.timesOfDay.beforeNoon === 'boolean' && (task.timesOfDay.beforeNoon as boolean) !== null &&
            typeof task.timesOfDay.atNoon === 'boolean' && (task.timesOfDay.atNoon as boolean) !== null &&
            typeof task.timesOfDay.inTheAfternoon === 'boolean' && (task.timesOfDay.inTheAfternoon as boolean) !== null &&
            typeof task.timesOfDay.beforeEvening === 'boolean' && (task.timesOfDay.beforeEvening as boolean) !== null &&
            typeof task.timesOfDay.inTheEvening === 'boolean' && (task.timesOfDay.inTheEvening as boolean) !== null &&
            typeof task.timesOfDay.inTheNight === 'boolean' && (task.timesOfDay.inTheNight as boolean) !== null &&
            typeof task.timesOfDay.duringTheDay === 'boolean' && (task.timesOfDay.duringTheDay as boolean) !== null &&
            taskTimesOfDayKeys.some(e => e) // some true
        );

    }

}
