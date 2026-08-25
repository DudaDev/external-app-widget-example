export function millisToMinutesAndSeconds(millis: number): string {
  const minutes = Math.floor(millis / 60000);
  const secondsNum = Math.floor((millis % 60000) / 1000);
  const seconds = secondsNum < 10 ? `0${secondsNum}` : String(secondsNum);
  return `${minutes}:${seconds}`;
}
