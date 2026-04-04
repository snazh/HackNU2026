import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

const secret = process.env.LIVEBLOCKS_SECRET_KEY;

const liveblocks =
  typeof secret === "string" && secret.length > 0
    ? new Liveblocks({ secret })
    : null;

type Body = {
  room?: string;
  userId?: string;
  name?: string;
  color?: string;
};

export async function POST(request: Request) {
  if (!liveblocks) {
    return NextResponse.json(
      {
        error:
          "LIVEBLOCKS_SECRET_KEY is not set. Add it to .env.local (Dashboard → Secret key) and set NEXT_PUBLIC_LIVEBLOCKS_USE_AUTH=true on the client.",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room : "";
  const userId =
    typeof body.userId === "string" && body.userId.length > 0
      ? body.userId
      : `anon-${crypto.randomUUID()}`;

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "Guest";
  const color =
    typeof body.color === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(body.color)
      ? body.color
      : "#6366f1";

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, color },
  });

  if (room) {
    session.allow(room, session.FULL_ACCESS);
  } else {
    session.allow("*", session.FULL_ACCESS);
  }

  const { status, body: responseBody } = await session.authorize();
  return new NextResponse(responseBody, { status });
}
