import { NextResponse } from "next/server";
import { SyncFinalBodySchema } from "@photobooth/shared-types";
import { upsertFinal } from "../../../../../lib/store";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = SyncFinalBodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const finalRecord = upsertFinal(parsed.data);
  return NextResponse.json({ ok: true, token: finalRecord.shareToken });
}
