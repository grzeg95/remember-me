import {Injectable} from '@angular/core';
import {ConsentSettings} from '@angular/fire/analytics';

export interface CookiebotConsent {
  marketing: boolean;
  method: string;
  necessary: boolean;
  preferences: boolean;
  stamp: string;
  statistics: boolean;
}

@Injectable()
export class CookiebotService {

  constructor() {
  }

  getConsentSettings(): ConsentSettings {

    // @ts-ignore
    const cookiebotConsent = Cookiebot.consent as CookiebotConsent;

    return {
      ad_storage: cookiebotConsent.marketing ? 'granted' : 'denied',
      security_storage: 'granted',
      functionality_storage: 'granted',
      analytics_storage: cookiebotConsent.statistics ? 'granted' : 'denied',
      personalization_storage: 'granted',
    } as ConsentSettings;
  }
}
