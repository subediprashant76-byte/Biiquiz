export function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

export function msBetween(start: Date, end: Date) {
  return Math.max(0, end.getTime() - start.getTime());
}

