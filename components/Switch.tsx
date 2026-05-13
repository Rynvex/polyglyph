/**
 * Switch — sliding toggle styled to match Polyglyph's accent-orange
 * pill controls. Implemented as a `button[role="switch"]` so it
 * inherits native focus / keyboard / disabled semantics without an
 * `<input>` and label dance.
 */

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name. Visually hidden — render visible labels yourself. */
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const trackOn = "bg-accent";
  const trackOff = "bg-fg-faint/30";
  const trackBase =
    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

  const thumbBase =
    "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform";
  const thumbPos = checked ? "translate-x-[1.125rem]" : "translate-x-0.5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${trackBase} ${checked ? trackOn : trackOff}`}
    >
      <span className={`${thumbBase} ${thumbPos}`} aria-hidden />
    </button>
  );
}
