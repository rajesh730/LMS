import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Global wall is no longer available" },
    { status: 404 }
  );
}
