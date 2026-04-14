"use client";

import { useState, useCallback } from "react";
import {
  POPULAR_CHAINS,
  riskLevel,
  taxColor,
  Spinner,
} from "@/components/shared";

/* ─── Types ─── */
interface SearchResult {
  address: string;
  chain: string;
  name: string;
  symbol: string;
  logo_url: string;
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
const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "bg-red-100", text: "text-red-700", label: "CRITICAL" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700", label: "HIGH" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-700", label: "MEDIUM" },
  LOW: { bg: "bg-blue-100", text: "text-blue-700", label: "LOW" },
  NONE: { bg: "bg-green-100", text: "text-green-700", label: "NONE" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.NONE;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
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

/* ─── Component ─── */
export default function ScannerPage() {
  const [keyword, setKeyword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected token
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // AVE data
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 1: Search tokens
  const search = useCallback(async () => {
    const query = keyword.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    setSelected(null);
    setRisk(null);
    setTokenData(null);
    setDetailError(null);
    setAiAnalysis(null);
    setAiError(null);

    try {
      const res = await fetch(
        `/api/scan?keyword=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const results: SearchResult[] = await res.json();
      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSearchLoading(false);
    }
  }, [keyword]);

  // Step 2: User selects a token → fetch AVE + source + AI analysis
  const selectToken = useCallback(async (result: SearchResult) => {
    setSelected(result);
    setDetailLoading(true);
    setDetailError(null);
    setRisk(null);
    setTokenData(null);
    setAiAnalysis(null);
    setAiError(null);

    try {
      // Fetch AVE risk data and Etherscan source code in parallel
      const [aveRes, srcRes] = await Promise.all([
        fetch(
          `/api/security?address=${encodeURIComponent(result.address)}&chain=${encodeURIComponent(result.chain)}`
        ),
        fetch(
          `/api/fetch-source?address=${encodeURIComponent(result.address)}&chain=${encodeURIComponent(result.chain)}`
        ),
      ]);

      // Process AVE data
      if (aveRes.ok) {
        const aveJson = await aveRes.json();
        setRisk(aveJson.risk);
        setTokenData(aveJson.token);
      }

      // Process source code
      const srcJson = srcRes.ok ? await srcRes.json() : null;
      const sourceCode = srcJson?.sourceCode ?? null;

      // Run AI analysis if source code was fetched
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

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      <div className="flex-1 px-6 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {/* Page title */}
        <h1 className="text-xl font-semibold text-gray-900 mb-1">PermissionGuard</h1>
        <p className="text-sm text-gray-500 mb-6">
          Search by token name, symbol, or contract address to check admin risk and security permissions.
        </p>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Token name, symbol, or contract address (e.g. PEPE, 0x...)"
              className="flex-1 h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono placeholder:text-gray-400"
            />
            <button
              onClick={search}
              disabled={searchLoading || !keyword.trim()}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {searchLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Searching
                </span>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {/* Search Loading */}
        {searchLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8 text-blue-500" />
            <span className="ml-3 text-gray-500">Searching tokens...</span>
          </div>
        )}

        {/* Search Results List */}
        {searchResults && !searchLoading && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Search Results ({searchResults.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((r) => (
                <button
                  key={`${r.address}-${r.chain}`}
                  onClick={() => selectToken(r)}
                  disabled={detailLoading}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected?.address === r.address && selected?.chain === r.chain
                      ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  } disabled:opacity-60`}
                >
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {r.name} <span className="text-gray-400">{r.symbol}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {POPULAR_CHAINS.find((c) => c.chain === r.chain)?.name ?? r.chain}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail Loading */}
        {detailLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8 text-blue-500" />
            <span className="ml-3 text-gray-500">Analyzing token security...</span>
          </div>
        )}

        {/* Detail Error */}
        {detailError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {detailError}
          </div>
        )}

        {/* Token Detail */}
        {selected && !detailLoading && (risk || tokenData || aiAnalysis) && (
          <div className="space-y-6 pb-8">
            {/* ── Summary Card ── */}
            <div className={`rounded-2xl border p-6 ${aveLevel.bg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {selected.logo_url && (
                    <img
                      src={selected.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold truncate text-gray-900">
                      {selected.name || "Unknown Token"}
                      {selected.symbol && (
                        <span className="text-gray-400 font-normal ml-2">
                          {selected.symbol}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono truncate mt-1">
                      {selected.address}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {POPULAR_CHAINS.find((c) => c.chain === selected.chain)?.name ?? selected.chain}
                    </p>
                  </div>
                </div>

                {/* AI Risk Score (if available) */}
                {aiAnalysis && (
                  <div className="flex items-center gap-4">
                    <div className="text-center px-4">
                      <div className="text-xs text-gray-400 mb-1">AI Risk Score</div>
                      <div className={`text-4xl font-bold ${
                        aiRiskLevel === "DANGEROUS" ? "text-red-600" :
                        aiRiskLevel === "CAUTION" ? "text-yellow-600" :
                        aiRiskLevel === "SAFE" ? "text-green-600" :
                        "text-gray-500"
                      }`}>
                        {aiRiskScore ?? "—"}
                      </div>
                      <div className={`text-sm font-semibold mt-1 ${
                        aiRiskLevel === "DANGEROUS" ? "text-red-600" :
                        aiRiskLevel === "CAUTION" ? "text-yellow-600" :
                        aiRiskLevel === "SAFE" ? "text-green-600" :
                        "text-gray-500"
                      }`}>
                        {aiRiskLevel}
                      </div>
                    </div>
                    {aveScore > 0 && (
                      <div className="text-center px-4 border-l border-gray-200/60">
                        <div className="text-xs text-gray-400 mb-1">AVE Score</div>
                        <div className={`text-2xl font-bold ${aveLevel.color}`}>{aveScore}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AVE numeric data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200/60">
                <div>
                  <div className="text-xs text-gray-400">Market Cap</div>
                  <div className="text-sm font-medium mt-0.5 text-gray-800">
                    {tokenData?.market_cap
                      ? `$${Number(tokenData.market_cap).toLocaleString()}`
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

            {/* AI Analysis Error */}
            {aiError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                {aiError}
              </div>
            )}

            {/* ── Overview ── */}
            {aiAnalysis && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-600">{aiAnalysis.overview}</p>
                {aiAnalysis.recommendation && (
                  <p className="text-sm font-medium text-blue-700 mt-2">Recommendation: {aiAnalysis.recommendation}</p>
                )}
              </div>
            )}

            {/* ── Controller Info ── */}
            {aiAnalysis?.controller && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Controller / Owner
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Type</div>
                    <div className="text-sm font-medium mt-0.5 text-gray-800">{aiAnalysis.controller.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Address</div>
                    <div className="text-sm font-mono mt-0.5 text-gray-800 truncate">
                      {aiAnalysis.controller.address || "Not detected"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Details</div>
                    <div className="text-sm mt-0.5 text-gray-600">{aiAnalysis.controller.description}</div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Permission Table ── */}
            {aiAnalysis?.permissions && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Admin Permission Analysis
                </h3>
                <div className="divide-y divide-gray-100">
                  {Object.entries(aiAnalysis.permissions).map(([key, perm]) => (
                    <div key={key} className="flex items-start gap-3 py-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          perm.present
                            ? perm.severity === "CRITICAL" ? "bg-red-500" :
                              perm.severity === "HIGH" ? "bg-orange-500" :
                              perm.severity === "MEDIUM" ? "bg-yellow-500" :
                              "bg-blue-500"
                            : "bg-green-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {PERMISSION_LABELS[key] ?? key.replace(/_/g, " ")}
                          </span>
                          {perm.present ? (
                            <SeverityBadge severity={perm.severity} />
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              SAFE
                            </span>
                          )}
                        </div>
                        {perm.present && perm.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Vulnerabilities ── */}
            {aiAnalysis?.vulnerabilities && aiAnalysis.vulnerabilities.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Vulnerabilities Found ({aiAnalysis.vulnerabilities.length})
                </h3>
                <div className="space-y-3">
                  {aiAnalysis.vulnerabilities.map((v, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{v.name}</span>
                        <SeverityBadge severity={v.severity} />
                      </div>
                      <p className="text-xs text-gray-600">{v.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Raw AI text fallback ── */}
            {aiAnalysis?.rawText && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  AI Analysis
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words">
                  {aiAnalysis.rawText}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
