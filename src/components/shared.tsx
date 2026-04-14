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

export function riskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Dangerous", color: "text-red-600", bg: "bg-red-50 border-red-200" };
  if (score >= 50) return { label: "High Risk", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  if (score >= 30) return { label: "Caution", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  if (score >= 10) return { label: "Low Risk", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
  return { label: "Safe", color: "text-green-600", bg: "bg-green-50 border-green-200" };
}

export function boolTag(value: number | string | boolean | undefined) {
  const v = String(value).toLowerCase();
  const isTrue = v === "1" || v === "true" || v === "yes";
  const isFalse = v === "0" || v === "false" || v === "no" || v === "" || value === undefined || value === null;
  if (isTrue)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
        YES
      </span>
    );
  if (isFalse)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
        NO
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">
      {String(value)}
    </span>
  );
}

export function taxColor(tax: number) {
  if (tax >= 20) return "text-red-600";
  if (tax >= 5) return "text-orange-600";
  if (tax >= 1) return "text-amber-600";
  return "text-green-600";
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
      <span className="text-gray-500">{label}</span>
      <span className="flex-shrink-0">{value}</span>
    </div>
  );
}
