/**
 * CapsLockWarning — yellow strip shown when CapsLock is on.
 */

interface CapsLockWarningProps {
  active: boolean;
}

export function CapsLockWarning({ active }: CapsLockWarningProps) {
  if (!active) return null;
  return (
    <div
      role="status"
      data-testid="capslock-warning"
      className="rounded-lg bg-warning/15 px-3 py-2 text-xs font-medium text-warning ring-1 ring-warning/30"
    >
      ⚠ Caps Lock is on — turn it off if your input keeps going red.
    </div>
  );
}
