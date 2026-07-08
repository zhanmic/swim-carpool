import { OPENAPI_SPEC } from "@/lib/openapi";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC);
}
