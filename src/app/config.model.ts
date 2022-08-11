export const defaultGuestComponentConfig: GuestComponentConfig = {
  lastUpdate: 'Last update 1 Jan 1970;',
  motto: 'Carpe diem or nie;'
}

export interface GuestComponentConfig {
  lastUpdate: string
  motto: string
}
