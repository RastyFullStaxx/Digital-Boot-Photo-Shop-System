import { NextResponse } from "next/server";
import { BrandProfileSchema } from "@photobooth/shared-types";
import { appendAudit, getBrandProfile, upsertBrandProfile } from "../../../../../lib/store";
import { requireAdminApi } from "../../../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const profile = getBrandProfile("brand-default");
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await request.json();
  const parsed = BrandProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const profile = upsertBrandProfile(parsed.data);
  appendAudit("branding.upsert", "admin-api", { brandProfileId: profile.id });

  return NextResponse.json({ ok: true, profile });
}
