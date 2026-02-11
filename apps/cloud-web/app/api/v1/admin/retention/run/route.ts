import { NextResponse } from "next/server";
import { RetentionRunBodySchema } from "@photobooth/shared-types";
import { appendAudit, runRetention } from "../../../../../../lib/store";
import { requireAdminApi } from "../../../../../../lib/auth";

export async function POST(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await request.json();
  const parsed = RetentionRunBodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const summary = runRetention(parsed.data.olderThanDays);
  appendAudit("retention.run", "admin-api", {
    olderThanDays: parsed.data.olderThanDays,
    ...summary
  });

  return NextResponse.json({ ok: true, ...summary });
}
