import { NextRequest, NextResponse } from "next/server";

type OneMapItem = {
  SEARCHVAL?: string;
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
};

export async function GET(request: NextRequest) {
  const postalCode = request.nextUrl.searchParams.get("postalCode") ?? "";

  if (!/^\d{6}$/.test(postalCode)) {
    return NextResponse.json(
      { message: "postalCode must be exactly 6 digits." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
    url.searchParams.set("searchVal", postalCode);
    url.searchParams.set("returnGeom", "Y");
    url.searchParams.set("getAddrDetails", "Y");
    url.searchParams.set("pageNum", "1");

    const apiKey = process.env.ONEMAP_API_KEY;
    const headers: HeadersInit = {};
    if (apiKey) {
      // Keep API key on server side only.
      headers.Authorization = apiKey.startsWith("Bearer ")
        ? apiKey
        : `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to fetch OneMap search results." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { results?: OneMapItem[] };
    const results = (data.results ?? []).map((item) => ({
      label: item.ADDRESS ?? item.SEARCHVAL ?? "",
      postalCode: item.POSTAL ?? "",
      latitude: item.LATITUDE ?? "",
      longitude: item.LONGITUDE ?? ""
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { message: "Unexpected error while calling OneMap API." },
      { status: 500 }
    );
  }
}
