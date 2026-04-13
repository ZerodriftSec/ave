import { NextResponse } from "next/server";

const AVE_API_BASE = "https://prod.ave-api.com/v2";

export async function GET() {
  const apiKey = process.env.AVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${AVE_API_BASE}/supported_chains`, {
      headers: { "X-API-KEY": apiKey },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return NextResponse.json(data.status === 1 ? data.data : []);
  } catch (error) {
    console.error("Failed to fetch chains:", error);
    return NextResponse.json([], { status: 502 });
  }
}
