export interface HTTPSuccess {
  details: string;
  taskId?: string;
  created?: boolean;
}

export interface HTTPError {
  code: string;
  message: string;
  details: string;
}
