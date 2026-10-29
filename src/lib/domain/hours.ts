// Calls only go out when a wholesaler would reasonably pick up: Mon-Sat, 10:00 to 18:30 IST,
// not on major holidays. Holidays list needs a yearly update.

const IST_OFFSET_MIN = 330;
const OPEN_MIN = 10 * 60;
const CLOSE_MIN = 18 * 60 + 30;

export const HOLIDAYS = new Set([
  "2026-01-26", "2026-03-04", "2026-08-15", "2026-10-02", "2026-10-20", "2026-11-08", "2026-11-09",
  "2027-01-26", "2027-03-22", "2027-08-15", "2027-10-02", "2027-10-29",
]);

type IstParts = { date: string; weekday: number; minutes: number };

function istParts(d: Date): IstParts {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    date: t.toISOString().slice(0, 10),
    weekday: t.getUTCDay(), // 0 = Sunday
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

function istDateAt(date: string, minutes: number): Date {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${h}:${m}:00+05:30`);
}

function isWorkingDay(p: IstParts): boolean {
  return p.weekday !== 0 && !HOLIDAYS.has(p.date);
}

export function isCallingWindow(d: Date): boolean {
  const p = istParts(d);
  return isWorkingDay(p) && p.minutes >= OPEN_MIN && p.minutes < CLOSE_MIN;
}

/** The earliest moment at or after `from` that falls inside the calling window. */
export function nextCallingSlot(from: Date): Date {
  if (isCallingWindow(from)) return from;
  let p = istParts(from);
  if (isWorkingDay(p) && p.minutes < OPEN_MIN) return istDateAt(p.date, OPEN_MIN);
  // Move to the next working day's opening time.
  let cursor = istDateAt(p.date, OPEN_MIN);
  for (let i = 0; i < 14; i++) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    p = istParts(cursor);
    if (isWorkingDay(p)) return istDateAt(p.date, OPEN_MIN);
  }
  return cursor;
}

/** Spreads n calls across the window, `gapMinutes` apart, each inside calling hours. */
export function scheduleSlots(from: Date, n: number, gapMinutes: number): Date[] {
  const out: Date[] = [];
  let t = nextCallingSlot(from);
  for (let i = 0; i < n; i++) {
    out.push(t);
    t = nextCallingSlot(new Date(t.getTime() + gapMinutes * 60_000));
  }
  return out;
}
