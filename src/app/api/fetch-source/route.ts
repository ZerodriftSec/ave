import { NextRequest, NextResponse } from "next/server";
import { fetchEtherscanSource } from "@/lib/ave-client";
import { put, head, get } from "@vercel/blob";

function blobKey(prefix: string, address: string, chain: string) {
  return `${prefix}/${address}_${chain}.json`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain");

  if (!address || !chain) {
    return NextResponse.json(
      { error: "Missing address or chain parameter" },
      { status: 400 }
    );
  }

  const key = blobKey("sources", address, chain);

  // Check cache first
  try {
    const cached = await head(key);
    console.log(`[FetchSource] Cache check for ${key}:`, cached ? "found" : "not found");
    if (cached) {
      const result = await get(key, { access: "private" });
      if (result?.stream) {
        // Read from stream
        const reader = result.stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const text = new TextDecoder().decode(Buffer.concat(chunks));
        const data = JSON.parse(text);
        if (data.sourceCode) {
          console.log(`[FetchSource] Cache hit for ${address} on ${chain}`);
          return NextResponse.json({ sourceCode: data.sourceCode, cached: true });
        }
      }
    }
  } catch (err) {
    console.log(`[FetchSource] Cache miss for ${key}`);
    // cache miss, continue
  }

  try {
    const result = await fetchEtherscanSource(address, chain);

    if (!result.sourceCode) {
      return NextResponse.json(
        { error: result.error || "No verified source code found.", sourceCode: null },
        { status: 200 }
      );
    }

    // Save to Vercel Blob
    try {
      const payload = JSON.stringify({ sourceCode: result.sourceCode, address, chain, cachedAt: new Date().toISOString() });
      await put(key, payload, { access: "private", contentType: "application/json" });
      console.log(`[FetchSource] Source cached to blob: ${key}`);
    } catch (saveErr) {
      console.log("[FetchSource] Blob cache unavailable, skipping cache");
    }

    return NextResponse.json({ sourceCode: result.sourceCode, cached: false });
  } catch (error) {
    console.error("[FetchSource] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source code" },
      { status: 502 }
    );
  }
}
