import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/ave-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

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
    console.log(`[Scan] Searching tokens for keyword: "${keyword}" (page: ${page}, limit: ${limit})`);
    const results = await searchTokens(keyword.trim());

    if (!results || results.length === 0) {
      console.log(`[Scan] No tokens found for "${keyword}"`);
      return NextResponse.json(
        { error: "No tokens found matching your search" },
        { status: 404 }
      );
    }

    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    console.log(`[Scan] Found ${total} results for "${keyword}", returning page ${page}/${totalPages}`);

    return NextResponse.json({
      tokens: paginatedResults.map((r) => ({
        address: r.token,
        chain: r.chain,
        name: r.name,
        symbol: r.symbol,
        logo_url: r.logo_url,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to search tokens" },
      { status: 502 }
    );
  }
}
