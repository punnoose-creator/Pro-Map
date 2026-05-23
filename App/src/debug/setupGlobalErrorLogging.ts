import { ErrorUtils } from 'react-native';
import { pushCrashDebugLine } from './crashDebugBuffer';

const TAG = '[ProMap:JS]';

let installed = false;

/**
 * Logs uncaught JS errors to Metro / adb logcat before the default RN handler runs.
 * Does not catch native crashes (e.g. WebView GPU); use WebView callbacks + adb logcat for those.
 */
export function setupGlobalErrorLogging(): void {
  if (installed) return;
  installed = true;

  try {
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const message = error?.message ?? String(error);
      const stack = error?.stack ?? '';
      console.error(TAG, isFatal ? 'FATAL' : 'non-fatal', message, '\n', stack);
      pushCrashDebugLine(
        `${TAG} ${isFatal ? 'FATAL' : 'non-fatal'}`,
        message,
        stack || undefined
      );
      previous?.(error, isFatal);
    });
  } catch {
    // ignore if ErrorUtils unavailable in some test environments
  }

  console.log(TAG, 'Global error handler installed — filter logcat/Metro for', TAG);
}
