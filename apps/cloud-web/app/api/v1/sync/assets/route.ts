import { NextResponse } from "next/server";
import { MediaAssetSchema } from "@photobooth/shared-types";
import { upsertAsset } from "../../../../../lib/store";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = MediaAssetSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const asset = upsertAsset(parsed.data);
  return NextResponse.json({ ok: true, assetId: asset.id });
}
