// Test Etherscan V2 API connectivity
// Usage: source .env.local && node scripts/test-etherscan.mjs

import http from "node:http";
import tls from "node:tls";
import { URL } from "node:url";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const TEST_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT on Ethereum (verified)

const CHAINS = {
  eth: { chainId: 1, name: "Ethereum" },
  bsc: { chainId: 56, name: "BSC" },
  base: { chainId: 8453, name: "Base" },
  arbitrum: { chainId: 42161, name: "Arbitrum" },
  polygon: { chainId: 137, name: "Polygon" },
  optimism: { chainId: 10, name: "Optimism" },
  avalanche: { chainId: 43114, name: "Avalanche" },
};

function fetchViaProxy(targetUrl) {
  return new Promise((resolve, reject) => {
    if (!PROXY_URL) {
      fetch(targetUrl).then(r => r.text()).then(body => resolve({ status: 200, body })).catch(reject);
      return;
    }

    const proxy = new URL(PROXY_URL);
    const target = new URL(targetUrl);

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

      const tlsSocket = tls.connect({
        socket,
        servername: target.hostname,
      }, () => {
        const reqStr = `GET ${target.pathname}${target.search} HTTP/1.1\r\nHost: ${target.hostname}\r\nConnection: close\r\n\r\n`;
        tlsSocket.write(reqStr);
      });

      let data = "";
      let headersDone = false;
      let statusCode = 0;

      tlsSocket.on("data", (chunk) => {
        data += chunk.toString();
        if (!headersDone) {
          const headerEnd = data.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            headersDone = true;
            const headerSection = data.substring(0, headerEnd);
            const statusMatch = headerSection.match(/HTTP\/\d\.\d (\d+)/);
            statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
            data = data.substring(headerEnd + 4);
          }
        }
      });

      tlsSocket.on("end", () => {
        resolve({ status: statusCode, body: data });
      });

      tlsSocket.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Proxy connect timeout"));
    });
    req.end();
  });
}

async function testChain(chainKey, { chainId, name }) {
  // Etherscan V2 API: unified endpoint with chainid parameter
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${TEST_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
  console.log(`\n[${chainKey}] Testing: ${name} (chainId=${chainId})`);

  const start = Date.now();
  try {
    const { status, body } = await fetchViaProxy(url);
    const elapsed = Date.now() - start;
    console.log(`  HTTP Status: ${status} (${elapsed}ms)`);

    const json = JSON.parse(body);
    console.log(`  API status: ${json.status}, message: ${json.message}`);

    if (json.result?.[0]) {
      const src = json.result[0].SourceCode;
      if (src && src !== "") {
        console.log(`  Source found: ${src.length} chars`);
        console.log(`  Contract name: ${json.result[0].ContractName || "N/A"}`);
        console.log(`  Compiler: ${json.result[0].CompilerVersion || "N/A"}`);
      } else {
        console.log(`  Source: NOT VERIFIED (empty)`);
      }
    } else {
      console.log(`  Result: ${JSON.stringify(json.result).substring(0, 200)}`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`  FAILED (${elapsed}ms): ${err.message}`);
  }
}

async function main() {
  if (!ETHERSCAN_API_KEY) {
    console.error("Error: ETHERSCAN_API_KEY not set. Run with:");
    console.error("  source .env.local && node scripts/test-etherscan.mjs");
    process.exit(1);
  }

  console.log("=== Etherscan V2 API Connectivity Test ===");
  console.log(`API Key: ${ETHERSCAN_API_KEY.substring(0, 6)}...`);
  console.log(`Test address: ${TEST_ADDRESS} (USDT)`);
  console.log(`Proxy: ${PROXY_URL || "none"}`);

  for (const [chain, info] of Object.entries(CHAINS)) {
    await testChain(chain, info);
  }

  console.log("\n=== Done ===");
}

main();
