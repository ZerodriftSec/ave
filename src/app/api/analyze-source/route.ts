import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put, head, get } from "@vercel/blob";

function blobKey(prefix: string, address: string, chain: string) {
  return `${prefix}/${address}_${chain}.json`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sourceCode, address, chain } = body as {
    sourceCode?: string;
    address?: string;
    chain?: string;
  };

  if (!sourceCode || !sourceCode.trim()) {
    return NextResponse.json(
      { error: "sourceCode is required and must be non-empty" },
      { status: 400 }
    );
  }

  // Check analysis cache
  if (address && chain) {
    const key = blobKey("analysis", address, chain);
    try {
      const cached = await head(key);
      if (cached) {
        const result = await get(key, { access: "private" });
        if (result?.stream) {
          const reader = result.stream.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          const text = new TextDecoder().decode(Buffer.concat(chunks));
          const data = JSON.parse(text);
          if (data.analysis) {
            console.log(`[AI] Cache hit for ${address} on ${chain}, skipping AI call`);
            return NextResponse.json({ analysis: data.analysis, costUsd: 0, cached: true });
          }
        }
      }
    } catch (err) {
      console.log(`[AI] Cache miss for ${key}`);
      // cache miss, continue
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  });

  const systemPrompt = `You are an expert smart contract security auditor. Analyze the provided Solidity source code and return a JSON object with the following structure. You MUST respond with ONLY valid JSON, no markdown, no explanation outside the JSON.

Required JSON structure:
{
  "overview": "Brief one-sentence description of what the contract does",
  "risk_score": <number 0-100>,
  "risk_level": "<SAFE|CAUTION|DANGEROUS|UNKNOWN>",
  "permissions": {
    "mint_authority": { "present": <boolean>, "description": "<what and who can mint>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "freeze_authority": { "present": <boolean>, "description": "<can accounts be frozen/blacklisted>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "blacklist_authority": { "present": <boolean>, "description": "<blacklist capability details>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "pause_authority": { "present": <boolean>, "description": "<can transfers be paused>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "upgrade_authority": { "present": <boolean>, "description": "<can implementation be upgraded>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "sweep_authority": { "present": <boolean>, "description": "<can admin sweep/withdraw funds>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "owner_change_balance": { "present": <boolean>, "description": "<can owner modify balances directly>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "set_owner_authority": { "present": <boolean>, "description": "<ownership transfer mechanism>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "hidden_owner": { "present": <boolean>, "description": "<hidden/stealth owner detected>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "proxy_contract": { "present": <boolean>, "description": "<is this a proxy/upgradeable contract>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "selfdestruct": { "present": <boolean>, "description": "<can contract self-destruct>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "trading_cooldown": { "present": <boolean>, "description": "<trading cooldown restrictions>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "slippage_modifiable": { "present": <boolean>, "description": "<can slippage be modified>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" },
    "external_call": { "present": <boolean>, "description": "<external contract calls that pose risk>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW|NONE>" }
  },
  "controller": {
    "type": "<EOA|Multisig|Timelock|Contract|Unknown>",
    "address": "<owner/admin address if found, else null>",
    "description": "<description of the controlling entity>"
  },
  "vulnerabilities": [
    { "name": "<vulnerability name>", "description": "<details>", "severity": "<CRITICAL|HIGH|MEDIUM|LOW>" }
  ],
  "recommendation": "<one-sentence actionable recommendation>"
}

Be thorough. For each permission field, set "present" to true only if the contract actually has that capability. Set severity based on how dangerous that capability is in context.`;

  try {
    // Truncate source code if too long (max ~180k chars to fit context window)
    const maxLen = 180_000;
    const truncatedSource =
      sourceCode.length > maxLen
        ? sourceCode.slice(0, maxLen) + "\n\n... [truncated]"
        : sourceCode;

    const modelName = process.env.ANTHROPIC_MODEL || "glm-4.7";

    // Use streaming to avoid 10-minute timeout on large requests
    const stream = client.messages.stream({
      model: modelName,
      max_tokens: 81920,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Please analyze this Solidity smart contract source code for security risks and vulnerabilities:\n\n\`\`\`solidity\n${truncatedSource}\n\`\`\``,
        },
      ],
    });

    // Collect the full text from the stream
    let rawText = "";
    const startTime = Date.now();
    let lastLog = startTime;
    console.log(`[AI] Starting analysis (source: ${truncatedSource.length} chars, model: ${modelName})...`);

    for await (const event of stream) {
      if (event.type === "message_start") {
        console.log(`[AI] Stream connected, receiving response...`);
      }
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        rawText += event.delta.text;
        // Log progress every 2 seconds
        const now = Date.now();
        if (now - lastLog > 2000) {
          console.log(`[AI] Streaming... ${rawText.length} chars received (${((now - startTime) / 1000).toFixed(1)}s)`);
          lastLog = now;
        }
      }
    }

    console.log(`[AI] Stream complete: ${rawText.length} chars in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    if (!rawText) {
      return NextResponse.json(
        { error: "AI analysis returned no results" },
        { status: 502 }
      );
    }

    // Parse JSON from the response (strip markdown fences if present)
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      // If AI didn't return valid JSON, return raw text as analysis
      return NextResponse.json({ analysis: { rawText }, costUsd: 0 });
    }

    // Cache the analysis result to Vercel Blob
    if (address && chain) {
      try {
        const key = blobKey("analysis", address, chain);
        const payload = JSON.stringify({ analysis, address, chain, analyzedAt: new Date().toISOString() });
        await put(key, payload, { access: "private", contentType: "application/json" });
        console.log(`[AI] Analysis cached to blob: ${key}`);
      } catch (saveErr) {
        console.log("[AI] Blob cache unavailable, skipping cache");
      }
    }

    return NextResponse.json({ analysis, costUsd: 0, cached: false });
  } catch (error: unknown) {
    console.error("Source analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze source code";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
