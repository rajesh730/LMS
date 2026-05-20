import { NextResponse } from "next/server";
import {
  getPublicChallengeResponses,
  serializeChallengeResponse,
} from "@/lib/challengeShowcase";

export async function GET() {
  try {
    const responses = await getPublicChallengeResponses();

    return NextResponse.json({
      responses: responses.map(serializeChallengeResponse),
    });
  } catch (error) {
    console.error("GET /api/challenges/showcase error:", error);
    return NextResponse.json(
      { message: "Failed to load challenge showcase" },
      { status: 500 }
    );
  }
}
