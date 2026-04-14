import { NextRequest, NextResponse } from "next/server";
import { fetchAveRisk } from "@/lib/ave-client";

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

  if (!process.env.AVE_API_KEY) {
    return NextResponse.json(
      { error: "AVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const data = await fetchAveRisk(address, chain);
    return NextResponse.json(data);
  } catch (error) {
    console.error("AVE API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security data" },
      { status: 502 }
    );
  }
}
