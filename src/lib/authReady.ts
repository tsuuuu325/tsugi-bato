let resolveReady: (() => void) | null = null;
let ready = false;

export const authReadyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function markAuthReady(): void {
  if (ready) return;
  ready = true;
  resolveReady?.();
}

export function waitForAuthReady(): Promise<void> {
  return ready ? Promise.resolve() : authReadyPromise;
}
