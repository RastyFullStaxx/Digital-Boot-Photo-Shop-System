import { NextResponse } from "next/server";
import { TemplateSchema } from "@photobooth/shared-types";
import { listTemplates, upsertTemplate, appendAudit } from "../../../../../lib/store";
import { requireAdminApi } from "../../../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({ items: listTemplates() });
}

export async function POST(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await request.json();
  const parsed = TemplateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      },
      { status: 400 }
    );
  }

  const template = upsertTemplate(parsed.data);
  appendAudit("template.upsert", "admin-api", { templateId: template.id });

  return NextResponse.json({ ok: true, template });
}
