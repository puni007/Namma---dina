export type MotionMode = 'full' | 'calm' | 'off';
export type MotionPreference = 'auto' | MotionMode;

type DeviceCapabilities = Pick<Navigator, 'hardwareConcurrency'> & { deviceMemory?: number };

export function resolveMotionMode(
  preference: string | undefined,
  reducedMotion: boolean,
  device: DeviceCapabilities = navigator,
): MotionMode {
  if (reducedMotion) return 'off';
  if (preference === 'full' || preference === 'calm' || preference === 'off') return preference;

  const lowEnd = (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4)
    || (typeof device.deviceMemory === 'number' && device.deviceMemory <= 4);
  return lowEnd ? 'calm' : 'full';
}

export function getTimeOfDay(timezone: string, now = new Date()): 'dawn' | 'day' | 'dusk' | 'night' {
  let hour = now.getHours();
  try {
    hour = Number(new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  } catch {
    // Fall back to the device's local clock if the stored zone is unavailable.
  }
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}
