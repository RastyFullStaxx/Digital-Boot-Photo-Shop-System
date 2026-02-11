import { NextResponse } from "next/server";
import { listSessions } from "../../../../../lib/store";
import { requireAdminApi } from "../../../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  const result = listSessions(page, pageSize);
  return NextResponse.json(result);
}
