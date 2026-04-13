"use client";

import { useState, useCallback } from "react";

/* ─── Types ─── */
interface RiskData {
  is_honeypot: number;
  buy_tax: number;
  sell_tax: number;
  owner: string;
  creator_address: string;
  has_mint_method: number;
  has_black_method: number;
  has_white_method: number;
  transfer_pausable: string;
  is_proxy: string;
  selfdestruct: string;
  owner_change_balance: string;
  can_take_back_ownership: string;
  hidden_owner: string;
  has_owner_removed_risk: number;
  is_in_dex: string;
  pair_lock_percent: number;
  risk_score: number;
  total: string;
  holders: number;
  token_holders_rank: { address: string; percent: number; is_contract: number; is_lp: number }[];
  holder_analysis: {
    average_tax: number;
    sell_failure: number;
    sell_successful: number;
    simulate_holders: number;
  };
  external_call: string;
  trading_cooldown: string;
  slippage_modifiable: number;
  anti_whale_modifiable: string;
  creator_percent: string;
  owner_percent: string;
  approve_gas: string;
  dex: { amm: string; liquidity: number; name: string; pair: string }[];
  [key: string]: unknown;
}

interface TokenData {
  token: string;
  chain: string;
  name: string;
  symbol: string;
  decimal: number;
  current_price_usd: string;
  market_cap: number;
  fdv: number;
  total: string;
  logo_url: string;
  risk_score: string;
  risk_level: number;
  is_honeypot: boolean;
  has_mint_method: boolean;
  is_in_blacklist: boolean;
  [key: string]: unknown;
}

interface SecurityResponse {
  risk: RiskData | null;
  token: TokenData | null;
  holders: unknown;
}

/* ─── Helpers ─── */
function riskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Dangerous", color: "text-red-600", bg: "bg-red-50 border-red-200" };
  if (score >= 50) return { label: "High Risk", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  if (score >= 30) return { label: "Caution", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  if (score >= 10) return { label: "Low Risk", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
  return { label: "Safe", color: "text-green-600", bg: "bg-green-50 border-green-200" };
}

function boolTag(value: number | string | boolean | undefined) {
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

function taxColor(tax: number) {
  if (tax >= 20) return "text-red-600";
  if (tax >= 5) return "text-orange-600";
  if (tax >= 1) return "text-amber-600";
  return "text-green-600";
}

const POPULAR_CHAINS = [
  { chain: "eth", name: "Ethereum" },
  { chain: "bsc", name: "BSC" },
  { chain: "solana", name: "Solana" },
  { chain: "base", name: "Base" },
  { chain: "arbitrum", name: "Arbitrum" },
  { chain: "polygon", name: "Polygon" },
  { chain: "optimism", name: "Optimism" },
  { chain: "avalanche", name: "Avalanche" },
];

/* ─── Component ─── */
export default function Home() {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("eth");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Source code analysis state
  const [sourceCode, setSourceCode] = useState("");
  const [srcLoading, setSrcLoading] = useState(false);
  const [srcAnalysis, setSrcAnalysis] = useState<string | null>(null);
  const [srcCost, setSrcCost] = useState<number | null>(null);
  const [srcError, setSrcError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/security?address=${encodeURIComponent(trimmed)}&chain=${encodeURIComponent(chain)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json: SecurityResponse = await res.json();
      if (!json.risk && !json.token) {
        throw new Error("No data found for this address on the selected chain.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [address, chain]);

  const analyzeSource = useCallback(async () => {
    const trimmed = sourceCode.trim();
    if (!trimmed) return;
    setSrcLoading(true);
    setSrcError(null);
    setSrcAnalysis(null);
    setSrcCost(null);

    try {
      const res = await fetch("/api/analyze-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json: { analysis: string; costUsd: number } = await res.json();
      setSrcAnalysis(json.analysis);
      setSrcCost(json.costUsd);
    } catch (err) {
      setSrcError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSrcLoading(false);
    }
  }, [sourceCode]);

  const risk = data?.risk;
  const token = data?.token;
  const score = risk?.risk_score ?? Number(token?.risk_score ?? 0);
  const level = riskLevel(score);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            PG
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            PermissionGuard
          </h1>
          <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
            Onchain Admin Risk Monitor
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-4">
            Enter a token contract address to check its security and admin risk profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
            >
              {POPULAR_CHAINS.map((c) => (
                <option key={c.chain} value={c.chain}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="0x... or token contract address"
              className="flex-1 h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono placeholder:text-gray-400"
            />
            <button
              onClick={search}
              disabled={loading || !address.trim()}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning
                </span>
              ) : (
                "Scan"
              )}
            </button>
          </div>
        </div>

        {/* Source Code Analysis Section */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            AI Source Code Analysis
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste Solidity (EVM) contract source code for AI-powered risk and vulnerability analysis.
          </p>
          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder={`// Paste your Solidity contract here...\npragma solidity ^0.8.0;\n\ncontract MyToken {\n  // ...\n}`}
            className="w-full h-64 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 resize-y"
          />
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={analyzeSource}
              disabled={srcLoading || !sourceCode.trim()}
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {srcLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing
                </span>
              ) : (
                "Analyze Source Code"
              )}
            </button>
            {srcCost !== null && srcCost > 0 && (
              <span className="text-xs text-gray-400">
                Cost: ${srcCost.toFixed(4)}
              </span>
            )}
          </div>

          {/* Source Analysis Error */}
          {srcError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {srcError}
            </div>
          )}

          {/* Source Analysis Results */}
          {srcAnalysis && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                AI Risk Analysis
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words">
                {srcAnalysis}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className={`rounded-2xl border p-6 ${level.bg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Token info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {token?.logo_url && (
                    <img
                      src={token.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold truncate text-gray-900">
                      {token?.name || "Unknown Token"}
                      {token?.symbol && (
                        <span className="text-gray-400 font-normal ml-2">
                          {token.symbol}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono truncate mt-1">
                      {address.trim()}
                    </p>
                  </div>
                </div>

                {/* Risk Score */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${level.color}`}>
                      {score}
                    </div>
                    <div className={`text-sm font-medium mt-1 ${level.color}`}>
                      {level.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200/60">
                <div>
                  <div className="text-xs text-gray-400">Market Cap</div>
                  <div className="text-sm font-medium mt-0.5 text-gray-800">
                    {token?.market_cap
                      ? `$${Number(token.market_cap).toLocaleString()}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Holders</div>
                  <div className="text-sm font-medium mt-0.5 text-gray-800">
                    {risk?.holders?.toLocaleString() || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Buy Tax</div>
                  <div className={`text-sm font-medium mt-0.5 ${taxColor(risk?.buy_tax ?? 0)}`}>
                    {risk?.buy_tax != null ? `${risk.buy_tax}%` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Sell Tax</div>
                  <div className={`text-sm font-medium mt-0.5 ${taxColor(risk?.sell_tax ?? 0)}`}>
                    {risk?.sell_tax != null ? `${risk.sell_tax}%` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Powers */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Admin Powers
                </h3>
                <div className="space-y-3 text-sm">
                  <Row label="Can mint new tokens" value={boolTag(risk?.has_mint_method)} />
                  <Row label="Can freeze / blacklist" value={boolTag(risk?.has_black_method)} />
                  <Row label="Has whitelist control" value={boolTag(risk?.has_white_method)} />
                  <Row label="Can pause transfers" value={boolTag(risk?.transfer_pausable)} />
                  <Row label="Can upgrade contract" value={boolTag(risk?.is_proxy)} />
                  <Row label="Can modify balances" value={boolTag(risk?.owner_change_balance)} />
                  <Row label="Can self-destruct" value={boolTag(risk?.selfdestruct)} />
                  <Row label="Can modify slippage" value={boolTag(risk?.slippage_modifiable)} />
                  <Row label="Hidden owner exists" value={boolTag(risk?.hidden_owner)} />
                  <Row label="Can reclaim ownership" value={boolTag(risk?.can_take_back_ownership)} />
                  <Row label="External calls" value={boolTag(risk?.external_call)} />
                  <Row label="Trading cooldown" value={boolTag(risk?.trading_cooldown)} />
                </div>
              </section>

              {/* Ownership */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Ownership
                </h3>
                <div className="space-y-3 text-sm">
                  <Row
                    label="Owner"
                    value={
                      <span className="font-mono text-xs text-gray-500 break-all">
                        {risk?.owner || "—"}
                      </span>
                    }
                  />
                  <Row
                    label="Creator"
                    value={
                      <span className="font-mono text-xs text-gray-500 break-all">
                        {risk?.creator_address || "—"}
                      </span>
                    }
                  />
                  <Row
                    label="Owner holdings"
                    value={
                      <span className="text-gray-700">
                        {risk?.owner_percent ?? "—"}%
                      </span>
                    }
                  />
                  <Row
                    label="Creator holdings"
                    value={
                      <span className="text-gray-700">
                        {risk?.creator_percent ?? "—"}%
                      </span>
                    }
                  />
                  <Row
                    label="Ownership renounced"
                    value={boolTag(risk?.has_owner_removed_risk === 1)}
                  />
                  <Row
                    label="Ownership renounced risk"
                    value={boolTag(risk?.has_owner_removed_risk)}
                  />
                </div>

                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-8">
                  Scam Detection
                </h3>
                <div className="space-y-3 text-sm">
                  <Row label="Honeypot" value={boolTag(risk?.is_honeypot)} />
                  <Row
                    label="Holder sell failure"
                    value={
                      <span className="text-gray-700">
                        {risk?.holder_analysis
                          ? `${risk.holder_analysis.sell_failure} / ${risk.holder_analysis.simulate_holders}`
                          : "—"}
                      </span>
                    }
                  />
                  <Row
                    label="Avg tax (simulated)"
                    value={
                      <span className={taxColor(risk?.holder_analysis?.average_tax ?? 0)}>
                        {risk?.holder_analysis?.average_tax != null
                          ? `${risk.holder_analysis.average_tax}%`
                          : "—"}
                      </span>
                    }
                  />
                </div>
              </section>

              {/* Liquidity */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Liquidity
                </h3>
                <div className="space-y-3 text-sm">
                  <Row label="Listed on DEX" value={boolTag(risk?.is_in_dex)} />
                  <Row
                    label="LP lock percent"
                    value={
                      <span className="text-gray-700">
                        {risk?.pair_lock_percent != null
                          ? `${risk.pair_lock_percent}%`
                          : "—"}
                      </span>
                    }
                  />
                  {risk?.dex && risk.dex.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-400 mb-2">DEX Pairs</div>
                      {risk.dex.map((d, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-1.5 text-xs"
                        >
                          <span className="text-gray-500">{d.amm}</span>
                          <span className="text-gray-700 font-medium">
                            ${(d.liquidity ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Top Holders */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Top Holders
                </h3>
                {risk?.token_holders_rank && risk.token_holders_rank.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {risk.token_holders_rank.slice(0, 10).map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-gray-400 w-5 text-right flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-mono text-xs text-gray-500 truncate">
                            {h.address}
                          </span>
                          {h.is_contract === 1 && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              contract
                            </span>
                          )}
                          {h.is_lp === 1 && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              LP
                            </span>
                          )}
                        </div>
                        <span className="text-gray-700 font-medium ml-3 flex-shrink-0">
                          {h.percent?.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No holder data available</p>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-400">
        Powered by AVE Cloud Data API &middot; PermissionGuard
      </footer>
    </div>
  );
}

/* ─── Row helper ─── */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="flex-shrink-0">{value}</span>
    </div>
  );
}
