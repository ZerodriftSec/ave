const AVE_API_BASE = "https://prod.ave-api.com/v2";

export interface AveRiskData {
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
  external_call: string;
  trading_cooldown: string;
  slippage_modifiable: number;
  anti_whale_modifiable: string;
  creator_percent: string;
  owner_percent: string;
  approve_gas: string;
  [key: string]: unknown;
}

export interface AveTokenData {
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

export interface AveFetchResult {
  risk: AveRiskData | null;
  token: AveTokenData | null;
  holders: unknown;
}

async function unwrap(r: PromiseSettledResult<Response>) {
  if (r.status !== "fulfilled") return null;
  try {
    const json = await r.value.json();
    return json?.status === 1 ? json.data : null;
  } catch {
    return null;
  }
}

export async function fetchAveRisk(
  address: string,
  chain: string,
  apiKey?: string
): Promise<AveFetchResult> {
  const key = apiKey || process.env.AVE_API_KEY;
  if (!key) throw new Error("AVE_API_KEY not configured");

  const tokenId = `${address}-${chain}`;
  const headers = { "X-API-KEY": key };

  const [riskRes, tokenRes, holdersRes] = await Promise.allSettled([
    fetch(`${AVE_API_BASE}/contracts/${tokenId}`, { headers }),
    fetch(`${AVE_API_BASE}/tokens/${tokenId}`, { headers }),
    fetch(`${AVE_API_BASE}/tokens/top100/${tokenId}`, { headers }),
  ]);

  const [riskData, tokenData, holdersData] = await Promise.all([
    unwrap(riskRes),
    unwrap(tokenRes),
    unwrap(holdersRes),
  ]);

  return {
    risk: riskData as AveRiskData | null,
    token: tokenData as AveTokenData | null,
    holders: holdersData,
  };
}

/* ─── Etherscan source code fetch ─── */

// Etherscan V2 uses a unified endpoint with chainid parameter
const ETHERSCAN_CHAIN_IDS: Record<string, number> = {
  eth: 1,
  bsc: 56,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  avalanche: 43114,
};

// HTTPS fetch via CONNECT tunnel proxy (works with Node.js native fetch)
import http from "node:http";
import tls from "node:tls";

function httpsGetViaProxy(targetUrl: string): Promise<string> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const target = new URL(targetUrl);

  return new Promise((resolve, reject) => {
    if (!proxyUrl) {
      // Direct — use native fetch as fallback
      fetch(targetUrl).then(r => r.text()).then(resolve).catch(reject);
      return;
    }

    const proxy = new URL(proxyUrl);
    const req = http.request({
      host: proxy.hostname,
      port: proxy.port,
      method: "CONNECT",
      path: `${target.hostname}:443`,
      timeout: 15000,
    });

    req.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      const tlsSocket = tls.connect({ socket, servername: target.hostname }, () => {
        const path = target.pathname + target.search;
        tlsSocket.write(`GET ${path} HTTP/1.1\r\nHost: ${target.hostname}\r\nConnection: close\r\n\r\n`);
      });

      let data = "";
      let headersDone = false;

      tlsSocket.on("data", (chunk: Buffer) => {
        data += chunk.toString();
        if (!headersDone) {
          const headerEnd = data.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            headersDone = true;
            data = data.substring(headerEnd + 4);
          }
        }
      });

      tlsSocket.on("end", () => resolve(data));
      tlsSocket.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Proxy connect timeout")); });
    req.end();
  });
}

export interface EtherscanResult {
  sourceCode: string | null;
  error: string | null;
}

export async function fetchEtherscanSource(
  address: string,
  chain: string
): Promise<EtherscanResult> {
  const chainId = ETHERSCAN_CHAIN_IDS[chain];
  if (!chainId) {
    const msg = `Chain "${chain}" is not supported for source code analysis. Only EVM chains (Ethereum, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche) are supported.`;
    console.log(`[Etherscan] ${msg}`);
    return { sourceCode: null, error: msg };
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    const msg = "ETHERSCAN_API_KEY not set, skipping source fetch";
    console.log(`[Etherscan] ${msg}`);
    return { sourceCode: null, error: msg };
  }

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    console.log(`[Etherscan] Fetching source for ${address} on ${chain} (chainId=${chainId}) via V2 API...`);

    const body = await httpsGetViaProxy(url);
    const json = JSON.parse(body);

    if (json.status !== "1" || !json.result?.[0]) {
      console.log(`[Etherscan] API returned non-success status=${json.status}, message=${json.message}`);
      return { sourceCode: null, error: `Etherscan API error: ${json.message || "unknown"}` };
    }

    const source = json.result[0].SourceCode;
    if (!source || source === "") {
      console.log(`[Etherscan] Contract ${address} is not verified (empty SourceCode)`);
      return { sourceCode: null, error: `Contract ${address} on ${chain} is not verified on Etherscan (no source code available).` };
    }

    // Etherscan sometimes wraps multi-file sources in {{...}}
    let finalSource = source;
    if (source.startsWith("{{") && source.endsWith("}}")) {
      try {
        const parsed = JSON.parse(source.slice(1, -1));
        const sources = parsed.sources as Record<string, { content: string }> | undefined;
        if (sources) {
          finalSource = Object.entries(sources)
            .map(([path, file]) => `// File: ${path}\n${file.content}`)
            .join("\n\n");
          console.log(`[Etherscan] Multi-file source (${Object.keys(sources).length} files), merged into ${finalSource.length} chars`);
        }
      } catch {
        // If parsing fails, return raw source
      }
    }

    console.log(`[Etherscan] Successfully fetched source: ${finalSource.length} chars for ${address} on ${chain}`);
    return { sourceCode: finalSource, error: null };
  } catch (err) {
    console.error(`[Etherscan] Error fetching source for ${address}:`, err);
    return { sourceCode: null, error: `Failed to fetch source code from Etherscan: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

/* ─── AVE Token Search ─── */

export interface TokenSearchResult {
  token: string;
  chain: string;
  name: string;
  symbol: string;
  logo_url: string;
  [key: string]: unknown;
}

export async function searchTokens(
  keyword: string,
  apiKey?: string
): Promise<TokenSearchResult[]> {
  const key = apiKey || process.env.AVE_API_KEY;
  if (!key) throw new Error("AVE_API_KEY not configured");

  const res = await fetch(
    `${AVE_API_BASE}/tokens?keyword=${encodeURIComponent(keyword)}`,
    { headers: { "X-API-KEY": key } }
  );

  const json = await res.json();
  if (json?.status !== 1 || !Array.isArray(json.data)) return [];

  return json.data as TokenSearchResult[];
}
