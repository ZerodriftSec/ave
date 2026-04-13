import { NextRequest, NextResponse } from "next/server";

const AVE_API_BASE = "https://prod.ave-api.com/v2";

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

  const apiKey = process.env.AVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const tokenId = `${address}-${chain}`;

  try {
    // Fetch both contract risk report and token detail in parallel
    const [riskRes, tokenRes, holdersRes] = await Promise.allSettled([
      fetch(`${AVE_API_BASE}/contracts/${tokenId}`, {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 60 },
      }),
      fetch(`${AVE_API_BASE}/tokens/${tokenId}`, {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 60 },
      }),
      fetch(`${AVE_API_BASE}/tokens/top100/${tokenId}`, {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 60 },
      }),
    ]);

    const unwrap = async (r: PromiseSettledResult<Response>) => {
      if (r.status !== "fulfilled") return null;
      try {
        const json = await r.value.json();
        return json?.status === 1 ? json.data : null;
      } catch {
        return null;
      }
    };

    const [riskData, tokenData, holdersData] = await Promise.all([
      unwrap(riskRes),
      unwrap(tokenRes),
      unwrap(holdersRes),
    ]);

    return NextResponse.json({
      risk: riskData,
      token: tokenData,
      holders: holdersData,
    });
  } catch (error) {
    console.error("AVE API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security data" },
      { status: 502 }
    );
  }
}
