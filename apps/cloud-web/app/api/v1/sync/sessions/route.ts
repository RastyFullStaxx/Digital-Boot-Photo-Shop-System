import { NextResponse } from "next/server";
import { SessionSchema } from "@photobooth/shared-types";
import { upsertSession } from "../../../../../lib/store";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = SessionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const session = upsertSession(parsed.data);
  return NextResponse.json({ ok: true, sessionId: session.id });
}
