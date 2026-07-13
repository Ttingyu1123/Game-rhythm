export function noteYAtTime({ hitLineY, noteTime, songTime, pixelsPerSecond }) {
  return hitLineY - (noteTime - songTime) * pixelsPerSecond;
}
