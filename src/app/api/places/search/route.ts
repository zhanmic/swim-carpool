import type { PlaceSuggestion } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

type NominatimPlace = {
  name?: string;
  display_name: string;
};

function toSuggestion(place: NominatimPlace): PlaceSuggestion {
  const name = place.name?.trim() || place.display_name.split(",")[0]?.trim() || place.display_name;
  return { name, address: place.display_name };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const params = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "1",
      limit: "6",
      countrycodes: "us",
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "SwimCarpool/1.0 (https://swim-carpool.vercel.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Place search failed" }, { status: 502 });
    }

    const data = (await res.json()) as NominatimPlace[];
    const suggestions = data.map(toSuggestion);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Place search failed" }, { status: 500 });
  }
}
