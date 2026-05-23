/** In-memory ring buffer for JS / WebView errors (native SIGSEGV etc. will not appear here). */

const MAX = 60;
const lines: string[] = [];
const listeners = new Set<() => void>();

function trim(): void {
  while (lines.length > MAX) lines.shift();
}

export function pushCrashDebugLine(source: string, message: string, stackOrExtra?: string): void {
  const ts = new Date().toISOString();
  const block = stackOrExtra?.trim()
    ? `[${ts}] ${source}\n${message}\n${stackOrExtra.trim()}`
    : `[${ts}] ${source}\n${message}`;
  lines.push(block);
  trim();
  console.warn('[ProMap:DebugBuffer]', source, message);
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export function subscribeCrashDebugBuffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCrashDebugText(): string {
  return lines.join('\n\n---\n\n');
}

export function clearCrashDebugBuffer(): void {
  lines.length = 0;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}
