
import { NextResponse } from "next/server";
import { DataStore } from "@/services/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [games, leaderboard] = await Promise.all([
      DataStore.getGames(),
      DataStore.getLeaderboard(),
    ]);

    return NextResponse.json({
      success: true,
      games,
      leaderboard,
    });
  } catch (error: unknown) {
    console.error("[Leaderboard API error]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load leaderboard";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
