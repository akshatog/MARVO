import marvoLogo from "../marvo_logo.jpg";

/**
 * Single source of truth for the MARVO logo (image mark + wordmark).
 * Used on the landing nav, landing footer and the Ask MARVO header so the
 * size, spacing and vertical alignment are identical everywhere.
 */
export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-logo ${className}`}>
      <img
        src={marvoLogo}
        alt="MARVO"
        className="brand-mark shrink-0"
        style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8 }}
      />
      <span className="brand-word font-display font-black text-ink-900">MARVO</span>
    </span>
  );
}