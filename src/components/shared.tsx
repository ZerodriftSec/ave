export const POPULAR_CHAINS = [
  { chain: "eth", name: "Ethereum" },
  { chain: "bsc", name: "BSC" },
  { chain: "solana", name: "Solana" },
  { chain: "base", name: "Base" },
  { chain: "arbitrum", name: "Arbitrum" },
  { chain: "polygon", name: "Polygon" },
  { chain: "optimism", name: "Optimism" },
  { chain: "avalanche", name: "Avalanche" },
];

export function riskLevel(score: number): { label: string; color: string; bg: string; glow: string } {
  if (score >= 80) return { label: "Dangerous", color: "text-[var(--neon-red)]", bg: "border-red-500/30 bg-red-950/30", glow: "neon-glow-red" };
  if (score >= 50) return { label: "High Risk", color: "text-[var(--neon-orange)]", bg: "border-orange-500/30 bg-orange-950/30", glow: "neon-glow-purple" };
  if (score >= 30) return { label: "Caution", color: "text-[var(--neon-yellow)]", bg: "border-yellow-500/30 bg-yellow-950/30", glow: "" };
  if (score >= 10) return { label: "Low Risk", color: "text-[var(--neon-cyan)]", bg: "border-cyan-500/30 bg-cyan-950/30", glow: "" };
  return { label: "Safe", color: "text-[var(--neon-green)]", bg: "border-green-500/30 bg-green-950/30", glow: "neon-glow-green" };
}

export function boolTag(value: number | string | boolean | undefined) {
  const v = String(value).toLowerCase();
  const isTrue = v === "1" || v === "true" || v === "yes";
  const isFalse = v === "0" || v === "false" || v === "no" || v === "" || value === undefined || value === null;
  if (isTrue)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        YES
      </span>
    );
  if (isFalse)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
        NO
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/20">
      {String(value)}
    </span>
  );
}

export function taxColor(tax: number) {
  if (tax >= 20) return "text-red-400";
  if (tax >= 5) return "text-orange-400";
  if (tax >= 1) return "text-yellow-400";
  return "text-green-400";
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="flex-shrink-0">{value}</span>
    </div>
  );
}
