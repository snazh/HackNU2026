import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin fetch for image URLs (e.g. Higgsfield CDN) when the browser blocks CORS.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, { redirect: "follow" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }
    const buf = await upstream.arrayBuffer();
    const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
    return new NextResponse(buf, {
      headers: { "Content-Type": ct },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
