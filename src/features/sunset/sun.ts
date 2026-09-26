// Sunset from the NOAA solar calculator equations (Meeus-based), accurate to about a minute in the tropics.
// Pure and offline: Sabbath times never need the network.

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Julian day at 0h UT of a calendar date. */
function julianDay(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

/** Solar declination (degrees) and equation of time (minutes) at Julian century T. */
function solar(T: number) {
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) +
    Math.sin(rad(3 * M)) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(L0)) -
        2 * e * Math.sin(rad(M)) +
        4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
        0.5 * y * y * Math.sin(4 * rad(L0)) -
        1.25 * e * e * Math.sin(2 * rad(M)),
    );
  return { decl, eqTime };
}

/** Minutes after 0h UT of the given calendar date at which the sun sets (zenith 90.833°). Null in polar day/night. */
function sunsetMinutesUtc(y: number, m: number, d: number, lat: number, lng: number): number | null {
  const jd0 = julianDay(y, m, d);
  let minutes = 720 - 4 * lng; // first guess: solar noon
  for (let i = 0; i < 2; i++) {
    const T = (jd0 + minutes / 1440 - 2451545) / 36525;
    const { decl, eqTime } = solar(T);
    const cosH = Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
    if (cosH < -1 || cosH > 1) return null;
    minutes = 720 - 4 * lng - eqTime + 4 * deg(Math.acos(cosH));
  }
  return minutes;
}

export type Place = { lat: number; lng: number; /** Hours east of UTC, e.g. 3 for EAT. */ tz: number };

/** A calendar date as seen in a place's time zone. */
export type LocalDate = { y: number; m: number; d: number };

export function localDate(instant: Date, tz: number): LocalDate {
  const s = new Date(instant.getTime() + tz * 3_600_000);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate() };
}

/** Day of week (0 = Sunday … 5 = Friday, 6 = Saturday) of a local date. */
export function weekday({ y, m, d }: LocalDate): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays({ y, m, d }: LocalDate, n: number): LocalDate {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Sunset instant for a local calendar date at a place. */
export function sunset(date: LocalDate, place: Place): Date | null {
  // Sunset in East/Central Africa is always on the same UTC date as the local date (tz ≤ +3, sunset ≈ 15–17 UT).
  const min = sunsetMinutesUtc(date.y, date.m, date.d, place.lat, place.lng);
  return min === null ? null : new Date(Date.UTC(date.y, date.m - 1, date.d) + Math.round(min * 60_000));
}

/** "HH:MM" of an instant in the place's time zone. */
export function formatTime(instant: Date, tz: number): string {
  const s = new Date(instant.getTime() + tz * 3_600_000);
  return `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`;
}

export type SabbathState =
  | { kind: 'before'; start: Date; startDate: LocalDate; isToday: boolean }
  | { kind: 'during'; end: Date; endDate: LocalDate };

/** Where `now` sits relative to the Sabbath (Friday sunset → Saturday sunset) at a place. */
export function sabbathState(now: Date, place: Place): SabbathState {
  const today = localDate(now, place.tz);
  const wd = weekday(today);
  if (wd === 5 || wd === 6) {
    const friday = wd === 5 ? today : addDays(today, -1);
    const start = sunset(friday, place);
    const saturday = addDays(friday, 1);
    const end = sunset(saturday, place);
    if (start && end && now >= start && now < end) return { kind: 'during', end, endDate: saturday };
    if (wd === 5 && start && now < start) return { kind: 'before', start, startDate: today, isToday: true };
  }
  const next = nextFridays(now, place, 1)[0];
  return { kind: 'before', start: next.sunset, startDate: next.date, isToday: false };
}

/** The next `count` Friday sunsets still in the future. */
export function nextFridays(now: Date, place: Place, count: number): { date: LocalDate; sunset: Date }[] {
  const out: { date: LocalDate; sunset: Date }[] = [];
  let day = localDate(now, place.tz);
  day = addDays(day, (5 - weekday(day) + 7) % 7);
  for (let guard = 0; out.length < count && guard < count + 2; guard++, day = addDays(day, 7)) {
    const s = sunset(day, place);
    if (s && s > now) out.push({ date: day, sunset: s });
  }
  return out;
}
