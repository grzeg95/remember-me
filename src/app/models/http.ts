export interface HTTPSuccess {
  details: string;
}

export interface HTTPError {
  code: string;
  message: string;
  details: string;
}
