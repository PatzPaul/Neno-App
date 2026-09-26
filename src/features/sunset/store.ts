import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kv } from '@/store/storage';

import type { Place } from './sun';

export type City = Place & { id: string; name: string; country: string };

/** Cities across the East-Central Africa Division; tz = hours east of UTC (no DST in the region). */
export const CITIES: City[] = [
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, tz: 3 },
  { id: 'dar', name: 'Dar es Salaam', country: 'Tanzania', lat: -6.7924, lng: 39.2083, tz: 3 },
  { id: 'dodoma', name: 'Dodoma', country: 'Tanzania', lat: -6.163, lng: 35.7516, tz: 3 },
  { id: 'arusha', name: 'Arusha', country: 'Tanzania', lat: -3.3869, lng: 36.683, tz: 3 },
  { id: 'mwanza', name: 'Mwanza', country: 'Tanzania', lat: -2.5164, lng: 32.9175, tz: 3 },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', lat: -4.0435, lng: 39.6682, tz: 3 },
  { id: 'kisumu', name: 'Kisumu', country: 'Kenya', lat: -0.0917, lng: 34.768, tz: 3 },
  { id: 'kampala', name: 'Kampala', country: 'Uganda', lat: 0.3476, lng: 32.5825, tz: 3 },
  { id: 'kigali', name: 'Kigali', country: 'Rwanda', lat: -1.9441, lng: 30.0619, tz: 2 },
  { id: 'bujumbura', name: 'Bujumbura', country: 'Burundi', lat: -3.3614, lng: 29.3599, tz: 2 },
  { id: 'kinshasa', name: 'Kinshasa', country: 'RDC', lat: -4.4419, lng: 15.2663, tz: 1 },
  { id: 'goma', name: 'Goma', country: 'RDC', lat: -1.6585, lng: 29.2205, tz: 2 },
  { id: 'lubumbashi', name: 'Lubumbashi', country: 'RDC', lat: -11.6609, lng: 27.4794, tz: 2 },
];

export const DEVICE_CITY_ID = 'device';

type SunsetStore = {
  city: City;
  remind: boolean;
  /** Scheduled local notification ids, so a reschedule can cancel exactly ours. */
  notificationIds: string[];
  setCity: (c: City) => void;
  setRemind: (on: boolean) => void;
  setNotificationIds: (ids: string[]) => void;
};

export const useSunset = create<SunsetStore>()(
  persist(
    (set) => ({
      city: CITIES[0],
      remind: false,
      notificationIds: [],
      setCity: (city) => set({ city }),
      setRemind: (remind) => set({ remind }),
      setNotificationIds: (notificationIds) => set({ notificationIds }),
    }),
    { name: 'sunset', storage: createJSONStorage(() => kv), version: 1 },
  ),
);
