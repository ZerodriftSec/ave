import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/ave-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword || !keyword.trim()) {
    return NextResponse.json(
      { error: "Missing keyword parameter" },
      { status: 400 }
    );
  }

  if (!process.env.AVE_API_KEY) {
    return NextResponse.json(
      { error: "AVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    console.log(`[Scan] Searching tokens for keyword: "${keyword}"`);
    const results = await searchTokens(keyword.trim());

    if (!results || results.length === 0) {
      console.log(`[Scan] No tokens found for "${keyword}"`);
      return NextResponse.json(
        { error: "No tokens found matching your search" },
        { status: 404 }
      );
    }

    console.log(`[Scan] Found ${results.length} results for "${keyword}"`);

    return NextResponse.json(
      results.slice(0, 20).map((r) => ({
        address: r.token,
        chain: r.chain,
        name: r.name,
        symbol: r.symbol,
        logo_url: r.logo_url,
      }))
    );
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to search tokens" },
      { status: 502 }
    );
  }
}
