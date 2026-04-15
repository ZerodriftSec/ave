"use client";

import { useState, useCallback, useEffect } from "react";
import {
  POPULAR_CHAINS,
  riskLevel,
  taxColor,
  Spinner,
} from "@/components/shared";

/* ─── Types ─── */
type SearchMode = "search" | "address";

interface SearchResult {
  address: string;
  chain: string;
  name: string;
  symbol: string;
  logo_url: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ScanApiResponse {
  tokens: SearchResult[];
  pagination: PaginationInfo;
}

interface TokenData {
  market_cap: number;
  current_price_usd: string;
  fdv: number;
  risk_score: string;
  [key: string]: unknown;
}

interface RiskData {
  risk_score: number;
  holders: number;
  buy_tax: number;
  sell_tax: number;
  [key: string]: unknown;
}

interface PermissionEntry {
  present: boolean;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

interface AiAnalysis {
  overview: string;
  risk_score: number;
  risk_level: string;
  permissions: Record<string, PermissionEntry>;
  controller: {
    type: string;
    address: string | null;
    description: string;
  };
  vulnerabilities: { name: string; description: string; severity: string }[];
  recommendation: string;
  rawText?: string;
}

/* ─── Helpers ─── */
const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", glow: "border-glow-critical" },
  HIGH:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", glow: "border-glow-high" },
  MEDIUM:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", glow: "border-glow-medium" },
  LOW:      { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", glow: "border-glow-low" },
  NONE:     { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", glow: "border-glow-safe" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.NONE;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${s.bg} ${s.text} border ${s.border}`}>
      {severity}
    </span>
  );
}

const PERMISSION_LABELS: Record<string, string> = {
  mint_authority: "Mint Authority",
  freeze_authority: "Freeze Authority",
  blacklist_authority: "Blacklist Authority",
  pause_authority: "Pause Authority",
  upgrade_authority: "Upgrade Authority",
  sweep_authority: "Fund Sweep / Withdraw",
  owner_change_balance: "Owner Can Change Balance",
  set_owner_authority: "Ownership Transfer",
  hidden_owner: "Hidden Owner",
  proxy_contract: "Proxy Contract",
  selfdestruct: "Self-Destruct",
  trading_cooldown: "Trading Cooldown",
  slippage_modifiable: "Slippage Modifiable",
  external_call: "External Call Risk",
};

/* ─── Sub-Components ─── */

/** Terminal-style loading animation with cycling messages */
function TerminalLoader({ messages }: { messages: string[] }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex flex-col items-center gap-4 py-12" style={{ animation: "fadeIn 0.4s ease-out" }}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className="w-16 h-16 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "var(--neon-cyan)",
            borderRightColor: "var(--neon-purple)",
            animation: "spin 1.2s linear infinite",
          }}
        />
        {/* Inner pulsing core */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,240,255,0.3), transparent 70%)",
            animation: "pulseGlow 2s ease-in-out infinite",
          }}
        />
      </div>
      <div className="font-mono text-sm text-[var(--text-secondary)] terminal-cursor">
        <span className="text-[var(--neon-green)]">&gt;</span>{" "}
        <span style={{ animation: "fadeIn 0.3s ease-out" }}>{messages[msgIndex]}</span>
      </div>
    </div>
  );
}

/** Animated circular risk gauge */
function RiskGauge({ score, level }: { score: number; level: string }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  const colorMap: Record<string, string> = {
    DANGEROUS: "#ff2d55",
    HIGH_RISK: "#ff8c00",
    CAUTION: "#ffd600",
    LOW_RISK: "#00f0ff",
    SAFE: "#00ff88",
  };
  const color = colorMap[level] || "#8892a4";

  return (
    <div className="relative w-28 h-28" style={{ animation: "fadeIn 0.8s ease-out" }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        {/* Progress ring */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color}60)`,
            animation: "progressRing 1.2s ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</div>
        <div className="text-[9px] font-bold tracking-widest mt-0.5 uppercase" style={{ color, opacity: 0.8 }}>
          {level.replace("_", " ")}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function ScannerPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>("search");
  const [keyword, setKeyword] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [selectedChain, setSelectedChain] = useState("eth");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [risk, setRisk] = useState<RiskData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 1: Search tokens OR Direct address lookup
  const search = useCallback(async (page: number = 1) => {
    if (searchMode === "address") {
      const address = addressInput.trim();
      if (!address) return;

      setSearchError(null);
      setSearchResults(null);
      setRisk(null);
      setTokenData(null);
      setAiAnalysis(null);
      setAiError(null);
      setDetailError(null);

      const mockResult: SearchResult = {
        address: address,
        chain: selectedChain,
        name: "Contract",
        symbol: "",
        logo_url: "",
      };

      await selectToken(mockResult);
    } else {
      const query = keyword.trim();
      if (!query) return;

      setSearchLoading(true);
      setSearchError(null);
      setSelected(null);
      setRisk(null);
      setTokenData(null);
      setDetailError(null);
      setAiAnalysis(null);
      setAiError(null);

      try {
        const res = await fetch(
          `/api/scan?keyword=${encodeURIComponent(query)}&page=${page}&limit=20`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data: ScanApiResponse = await res.json();
        setSearchResults(data.tokens);
        setPagination(data.pagination);
        setCurrentPage(page);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Unknown error");
        setPagination(null);
      } finally {
        setSearchLoading(false);
      }
    }
  }, [searchMode, addressInput, selectedChain, keyword]);

  // Step 2: User selects a token -> fetch AVE + source + AI analysis
  const selectToken = useCallback(async (result: SearchResult) => {
    setSelected(result);
    setDetailLoading(true);
    setDetailError(null);
    setRisk(null);
    setTokenData(null);
    setAiAnalysis(null);
    setAiError(null);

    try {
      const [aveRes, srcRes] = await Promise.all([
        fetch(
          `/api/security?address=${encodeURIComponent(result.address)}&chain=${encodeURIComponent(result.chain)}`
        ),
        fetch(
          `/api/fetch-source?address=${encodeURIComponent(result.address)}&chain=${encodeURIComponent(result.chain)}`
        ),
      ]);

      if (aveRes.ok) {
        const aveJson = await aveRes.json();
        setRisk(aveJson.risk);
        setTokenData(aveJson.token);
      }

      const srcJson = srcRes.ok ? await srcRes.json() : null;
      const sourceCode = srcJson?.sourceCode ?? null;

      if (sourceCode) {
        const aiRes = await fetch("/api/analyze-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCode, address: result.address, chain: result.chain }),
        });
        if (aiRes.ok) {
          const aiJson: { analysis: AiAnalysis; costUsd: number } = await aiRes.json();
          setAiAnalysis(aiJson.analysis);
        } else {
          const body = await aiRes.json().catch(() => ({}));
          setAiError(body.error || "AI analysis failed");
        }
      } else {
        setAiError(srcJson?.error || "No verified source code found on Etherscan for this contract.");
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const aveScore = risk?.risk_score ?? Number(tokenData?.risk_score ?? 0);
  const aveLevel = riskLevel(aveScore);
  const aiRiskLevel = aiAnalysis?.risk_level ?? "";
  const aiRiskScore = aiAnalysis?.risk_score;

  /* ─── Color helpers ─── */
  const aiColorMap: Record<string, string> = {
    DANGEROUS: "#ff2d55",
    CAUTION: "#ffd600",
    SAFE: "#00ff88",
    HIGH_RISK: "#ff8c00",
    LOW_RISK: "#00f0ff",
  };
  const _aiColor = aiColorMap[aiRiskLevel] || "#8892a4";

  const severityDotColor = (severity: string): string => {
    const map: Record<string, string> = {
      CRITICAL: "bg-red-500",
      HIGH: "bg-orange-500",
      MEDIUM: "bg-yellow-500",
      LOW: "bg-cyan-500",
      NONE: "bg-green-500",
    };
    return map[severity] ?? "bg-gray-500";
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ─── Background Effects ─── */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(0,240,255,0.04) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)" }} />

      {/* Floating orbs */}
      <div className="bg-orb" style={{ width: 400, height: 400, top: "10%", left: "5%", background: "radial-gradient(circle, rgba(0,240,255,0.12), transparent 70%)" }} />
      <div className="bg-orb" style={{ width: 350, height: 350, top: "50%", right: "10%", background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)", animationDelay: "-7s" }} />
      <div className="bg-orb" style={{ width: 300, height: 300, bottom: "10%", left: "30%", background: "radial-gradient(circle, rgba(0,255,136,0.06), transparent 70%)", animationDelay: "-13s" }} />

      {/* ─── Main Content ─── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Header ─── */}
        <header className="mb-10" style={{ animation: "slideUp 0.6s ease-out" }}>
          <div className="flex items-center gap-3 mb-2">
            {/* Shield Icon */}
            <div className="relative">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg" style={{ filter: "drop-shadow(0 0 8px rgba(0,240,255,0.4))" }}>
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="url(#shieldGrad)" />
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="rgba(0,240,255,0.6)" strokeWidth="0.5" fill="none" />
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="24">
                    <stop stopColor="#00f0ff" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Animated ripple behind shield */}
              <div className="absolute inset-0 rounded-full" style={{ animation: "ripple 3s ease-out infinite", border: "1px solid rgba(0,240,255,0.2)" }} />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-black tracking-tight gradient-text"
                style={{ animation: "glitchColor 8s ease-in-out infinite" }}
              >
                PERMISSION GUARD
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-12">
            <span className="font-mono text-xs text-[var(--text-muted)] tracking-wide">
              Token Risk Scanner // AI-Powered Security Analysis
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-green-400/70 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ animation: "dotPulse 2s ease-in-out infinite" }} />
              SYSTEM ACTIVE
            </span>
          </div>
          {/* Decorative separator */}
          <div className="mt-4 h-px w-full" style={{ background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), transparent)" }} />
        </header>

        {/* ─── Search Section ─── */}
        <section className="mb-8" style={{ animation: "slideUp 0.7s ease-out" }}>
          {/* Mode Toggle */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl inline-flex" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => setSearchMode("search")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 ${
                searchMode === "search"
                  ? "text-white shadow-lg"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
              style={searchMode === "search" ? { background: "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(139,92,246,0.2))", boxShadow: "0 0 15px rgba(0,240,255,0.1)" } : {}}
            >
              KEYWORD SEARCH
            </button>
            <button
              onClick={() => setSearchMode("address")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 ${
                searchMode === "address"
                  ? "text-white shadow-lg"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
              style={searchMode === "address" ? { background: "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(139,92,246,0.2))", boxShadow: "0 0 15px rgba(0,240,255,0.1)" } : {}}
            >
              DIRECT ADDRESS
            </button>
          </div>

          {/* Search Input Area */}
          {searchMode === "search" ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">&gt;</div>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="Token name, symbol, or contract address..."
                  className="w-full h-12 rounded-xl pl-9 pr-4 text-sm font-mono input-glow transition-all duration-300"
                  style={{
                    background: "rgba(10, 16, 30, 0.8)",
                    border: "1px solid rgba(0, 240, 255, 0.12)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <button
                onClick={() => search()}
                disabled={searchLoading || !keyword.trim()}
                className="h-12 px-8 rounded-xl btn-gradient text-sm font-semibold tracking-wide"
              >
                {searchLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    SCANNING
                  </span>
                ) : (
                  "SCAN"
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">&gt;</div>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="0x..."
                  className="w-full h-12 rounded-xl pl-9 pr-4 text-sm font-mono input-glow transition-all duration-300"
                  style={{
                    background: "rgba(10, 16, 30, 0.8)",
                    border: "1px solid rgba(0, 240, 255, 0.12)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="h-12 px-4 rounded-xl text-sm font-mono input-glow transition-all duration-300 cursor-pointer"
                style={{
                  background: "rgba(10, 16, 30, 0.8)",
                  border: "1px solid rgba(0, 240, 255, 0.12)",
                  color: "var(--text-primary)",
                }}
              >
                {POPULAR_CHAINS.filter(c => c.chain !== "solana").map((chain) => (
                  <option key={chain.chain} value={chain.chain} style={{ background: "#0a0f1e" }}>
                    {chain.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => search()}
                disabled={detailLoading || !addressInput.trim()}
                className="h-12 px-8 rounded-xl btn-gradient text-sm font-semibold tracking-wide"
              >
                {detailLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    ANALYZING
                  </span>
                ) : (
                  "ANALYZE"
                )}
              </button>
            </div>
          )}
        </section>

        {/* ─── Search Error ─── */}
        {searchError && (
          <div
            className="mb-6 rounded-xl p-4 text-sm glass-card border-red-500/30"
            style={{ animation: "slideUp 0.4s ease-out" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-xs">[ERROR]</span>
              <span className="text-red-300">{searchError}</span>
            </div>
          </div>
        )}

        {/* ─── Search Loading ─── */}
        {searchLoading && (
          <TerminalLoader messages={[
            "Querying blockchain index...",
            "Searching token database...",
            "Matching contract addresses...",
          ]} />
        )}

        {/* ─── Search Results ─── */}
        {searchResults && !searchLoading && (
          <div className="mb-8" style={{ animation: "fadeIn 0.5s ease-out" }}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                Search Results
              </h2>
              {pagination && (
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  [{pagination.total} found // page {pagination.page}/{pagination.totalPages}]
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((r, i) => {
                const isActive = selected?.address === r.address && selected?.chain === r.chain;
                return (
                  <button
                    key={`${r.address}-${r.chain}`}
                    onClick={() => selectToken(r)}
                    disabled={detailLoading}
                    className={`stagger-item flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-300 glass-card-hover ${
                      isActive
                        ? "border-cyan-500/40 bg-cyan-950/30"
                        : "border-white/[0.04] hover:border-cyan-500/20"
                    } disabled:opacity-40`}
                    style={{
                      background: isActive ? "rgba(0,240,255,0.06)" : "rgba(10,16,30,0.6)",
                      animationDelay: `${i * 0.04}s`,
                      boxShadow: isActive ? "0 0 20px rgba(0,240,255,0.08)" : "none",
                    }}
                  >
                    {r.logo_url ? (
                      <img src={r.logo_url} alt="" className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 ring-1 ring-white/10" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[var(--text-muted)] text-xs font-bold">{r.symbol?.[0] || "?"}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {r.name} <span className="text-[var(--text-muted)] font-normal">{r.symbol}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        {POPULAR_CHAINS.find((c) => c.chain === r.chain)?.name ?? r.chain}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => search(pagination.page - 1)}
                  disabled={!pagination.hasPrev || searchLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 disabled:opacity-30"
                  style={{
                    background: "rgba(10,16,30,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-secondary)",
                  }}
                >
                  PREV
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) pageNum = i + 1;
                    else if (pagination.page <= 3) pageNum = i + 1;
                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                    else pageNum = pagination.page - 2 + i;

                    const isCurrent = pageNum === pagination.page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => search(pageNum)}
                        disabled={searchLoading}
                        className="min-w-[2.25rem] h-9 rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-40"
                        style={{
                          background: isCurrent ? "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(139,92,246,0.2))" : "rgba(10,16,30,0.6)",
                          border: isCurrent ? "1px solid rgba(0,240,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          color: isCurrent ? "#fff" : "var(--text-secondary)",
                          boxShadow: isCurrent ? "0 0 10px rgba(0,240,255,0.1)" : "none",
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => search(pagination.page + 1)}
                  disabled={!pagination.hasNext || searchLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 disabled:opacity-30"
                  style={{
                    background: "rgba(10,16,30,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-secondary)",
                  }}
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Detail Loading ─── */}
        {detailLoading && (
          <TerminalLoader messages={[
            `Scanning contract at ${selected?.address?.slice(0, 10)}...`,
            "Fetching AVE risk data...",
            "Retrieving verified source code...",
            "Running AI security analysis...",
            "Evaluating admin permissions...",
            "Detecting vulnerabilities...",
          ]} />
        )}

        {/* ─── Detail Error ─── */}
        {detailError && (
          <div
            className="mb-6 rounded-xl p-4 text-sm glass-card border-red-500/30"
            style={{ animation: "slideUp 0.4s ease-out" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-xs">[ERROR]</span>
              <span className="text-red-300">{detailError}</span>
            </div>
          </div>
        )}

        {/* ─── Token Detail ─── */}
        {selected && !detailLoading && (risk || tokenData || aiAnalysis) && (
          <div className="space-y-5 pb-12" style={{ animation: "fadeIn 0.5s ease-out" }}>

            {/* ── Summary Card ── */}
            <div className={`glass-card p-6 border ${aveLevel.bg}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Token Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {selected.logo_url ? (
                    <div className="relative">
                      <img
                        src={selected.logo_url}
                        alt=""
                        className="w-14 h-14 rounded-full bg-gray-800 ring-2 ring-white/10 flex-shrink-0"
                      />
                      <div className="absolute -inset-1 rounded-full" style={{ boxShadow: "0 0 15px rgba(0,240,255,0.15)" }} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.15)" }}>
                      <span className="text-[var(--neon-cyan)] text-lg font-bold">{selected.symbol?.[0] || "?"}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate text-[var(--text-primary)]">
                      {selected.name || "Unknown Token"}
                      {selected.symbol && (
                        <span className="text-[var(--text-muted)] font-normal ml-2 text-base">
                          {selected.symbol}
                        </span>
                      )}
                    </h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-1">
                      {selected.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider"
                        style={{ background: "rgba(0,240,255,0.1)", color: "var(--neon-cyan)", border: "1px solid rgba(0,240,255,0.15)" }}
                      >
                        {POPULAR_CHAINS.find((c) => c.chain === selected.chain)?.name?.toUpperCase() ?? selected.chain.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Gauges */}
                <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                  {aiAnalysis && (
                    <RiskGauge score={aiRiskScore ?? 0} level={aiRiskLevel} />
                  )}
                  {aveScore > 0 && aiAnalysis && (
                    <div className="text-center">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mb-1 tracking-wider">AVE SCORE</div>
                      <div className={`text-2xl font-bold ${aveLevel.color}`}>{aveScore}</div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${aveLevel.color}`}>{aveLevel.label}</div>
                    </div>
                  )}
                  {!aiAnalysis && aveScore > 0 && (
                    <RiskGauge score={aveScore} level={aveLevel.label === "Dangerous" ? "DANGEROUS" : aveLevel.label === "High Risk" ? "HIGH_RISK" : aveLevel.label === "Caution" ? "CAUTION" : aveLevel.label === "Low Risk" ? "LOW_RISK" : "SAFE"} />
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { label: "Market Cap", value: tokenData?.market_cap ? `$${Number(tokenData.market_cap).toLocaleString()}` : "—" },
                  { label: "Holders", value: risk?.holders?.toLocaleString() || "—" },
                  { label: "Buy Tax", value: risk?.buy_tax != null ? `${risk.buy_tax}%` : "—", color: taxColor(risk?.buy_tax ?? 0) },
                  { label: "Sell Tax", value: risk?.sell_tax != null ? `${risk.sell_tax}%` : "—", color: taxColor(risk?.sell_tax ?? 0) },
                ].map((stat, i) => (
                  <div key={stat.label} className="stagger-item" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">{stat.label}</div>
                    <div className={`text-sm font-semibold mt-1 ${stat.color || "text-[var(--text-primary)]"}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis Error */}
            {aiError && (
              <div
                className="rounded-xl p-4 text-sm glass-card border-yellow-500/20"
                style={{ animation: "slideUp 0.5s ease-out" }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold text-xs mt-0.5">[WARN]</span>
                  <span className="text-yellow-300/80">{aiError}</span>
                </div>
              </div>
            )}

            {/* ── Overview ── */}
            {aiAnalysis && (
              <div className="glass-card p-6" style={{ animation: "slideUp 0.6s ease-out" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    AI Analysis Overview
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{aiAnalysis.overview}</p>
                {aiAnalysis.recommendation && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,240,255,0.08)" }}>
                    <p className="text-sm">
                      <span className="text-[var(--neon-cyan)] font-semibold">Recommendation:</span>{" "}
                      <span className="text-[var(--text-secondary)]">{aiAnalysis.recommendation}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Controller Info ── */}
            {aiAnalysis?.controller && (
              <section className="glass-card p-6" style={{ animation: "slideUp 0.7s ease-out" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-purple)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Controller / Owner
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider mb-1">TYPE</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{aiAnalysis.controller.type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider mb-1">ADDRESS</div>
                    <div className="text-xs font-mono text-[var(--neon-cyan)] truncate" title={aiAnalysis.controller.address || ""}>
                      {aiAnalysis.controller.address || "Not detected"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider mb-1">DETAILS</div>
                    <div className="text-sm text-[var(--text-secondary)]">{aiAnalysis.controller.description}</div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Permission Analysis ── */}
            {aiAnalysis?.permissions && (
              <section className="glass-card p-6" style={{ animation: "slideUp 0.8s ease-out" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-orange)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Admin Permission Analysis
                  </h3>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    [{Object.keys(aiAnalysis.permissions).length} checks]
                  </span>
                </div>
                <div className="space-y-1">
                  {Object.entries(aiAnalysis.permissions).map(([key, perm], i) => (
                    <div
                      key={key}
                      className={`stagger-item flex items-start gap-3 py-3 px-3 rounded-lg transition-all duration-200 hover:bg-white/[0.02] ${
                        perm.present ? SEVERITY_STYLES[perm.severity]?.glow || "" : "border-glow-safe"
                      }`}
                      style={{ animationDelay: `${0.8 + i * 0.04}s` }}
                    >
                      {/* Severity dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${severityDotColor(perm.present ? perm.severity : "NONE")}`}
                          style={perm.present && (perm.severity === "CRITICAL" || perm.severity === "HIGH") ? {
                            boxShadow: `0 0 6px ${perm.severity === "CRITICAL" ? "rgba(255,45,85,0.5)" : "rgba(255,140,0,0.5)"}`,
                          } : {}}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {PERMISSION_LABELS[key] ?? key.replace(/_/g, " ")}
                          </span>
                          {perm.present ? (
                            <SeverityBadge severity={perm.severity} />
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-green-500/15 text-green-400 border border-green-500/20">
                              SAFE
                            </span>
                          )}
                        </div>
                        {perm.present && perm.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{perm.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Vulnerabilities ── */}
            {aiAnalysis?.vulnerabilities && aiAnalysis.vulnerabilities.length > 0 && (
              <section className="glass-card p-6" style={{ animation: "slideUp 0.9s ease-out" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-red)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Vulnerabilities Detected
                  </h3>
                  <span className="font-mono text-[10px] text-[var(--neon-red)]">
                    [{aiAnalysis.vulnerabilities.length} issues]
                  </span>
                </div>
                <div className="space-y-3">
                  {aiAnalysis.vulnerabilities.map((v, i) => {
                    const s = SEVERITY_STYLES[v.severity] ?? SEVERITY_STYLES.NONE;
                    return (
                      <div
                        key={i}
                        className={`stagger-item rounded-xl p-4 ${s.glow} transition-all duration-300 hover:bg-white/[0.02]`}
                        style={{
                          background: "rgba(10,16,30,0.5)",
                          animationDelay: `${0.9 + i * 0.08}s`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{v.name}</span>
                          <SeverityBadge severity={v.severity} />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{v.description}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Raw AI text fallback ── */}
            {aiAnalysis?.rawText && (
              <section className="glass-card p-6" style={{ animation: "slideUp 1s ease-out" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-purple)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Raw AI Analysis
                  </h3>
                </div>
                <div className="font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed p-4 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.03)" }}
                >
                  {aiAnalysis.rawText}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── Footer ─── */}
        <footer className="mt-8 pb-6 text-center" style={{ animation: "fadeIn 1s ease-out" }}>
          <div className="h-px w-full mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.15), transparent)" }} />
          <p className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">
            PERMISSION GUARD // POWERED BY AVE & AI // SECURITY SCANNING ENGINE
          </p>
        </footer>
      </div>
    </div>
  );
}
