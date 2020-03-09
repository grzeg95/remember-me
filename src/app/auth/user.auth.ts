export interface IUserAuth {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  timesOfDay?: {
    [name: string]: {
      position: number;
      counter: number;
    }
  };
}
