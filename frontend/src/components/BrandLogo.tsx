import { CompassMark } from "./glyphs";

/**
 * Single source of truth for the ORCA logo (compass mark + wordmark).
 * Used on the landing nav, landing footer and the Ask ORCA header so the
 * size, spacing and vertical alignment are identical everywhere.
 */
export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-logo ${className}`}>
      <CompassMark size={40} className="brand-mark shrink-0 text-ink-900" />
      <span className="brand-word font-display font-black text-ink-900">ORCA</span>
    </span>
  );
}