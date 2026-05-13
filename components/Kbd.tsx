/**
 * Kbd — small inline keyboard-key badge used in footer hints and beside
 * buttons. Two visual styles:
 *   - default     muted theme surface, used in footer hints
 *   - on-button   light overlay on a colored button, more contrast
 */

interface KbdProps {
  children: React.ReactNode;
  variant?: "default" | "on-button";
}

export function Kbd({ children, variant = "default" }: KbdProps) {
  const cls =
    variant === "on-button"
      ? "rounded-md bg-black/25 px-2 py-0.5 font-mono text-xs font-semibold text-white/90 ring-1 ring-white/20"
      : "rounded-md bg-surface-2 px-2 py-0.5 font-mono text-sm font-semibold text-fg ring-1 ring-border";
  return <kbd className={cls}>{children}</kbd>;
}
