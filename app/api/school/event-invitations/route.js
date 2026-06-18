import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "School platform invitations are no longer available" },
    { status: 404 }
  );
}
