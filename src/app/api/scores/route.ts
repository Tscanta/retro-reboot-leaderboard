
import { NextRequest, NextResponse } from "next/server";
import { scoreSubmissionSchema } from "@/lib/validation/schemas";
import { DataStore } from "@/services/data-store";
import { verifyVolunteerSession } from "@/lib/auth/volunteer-session";
import {
  isSupabaseConfigured,
  createAdminClient,
} from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const session = verifyVolunteerSession(
      req.cookies.get("retro_volunteer_session")?.value
    );

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Your volunteer session is invalid or expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = scoreSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue =
        parsed.error.issues[0]?.message || "Validation failed";

      return NextResponse.json(
        { error: firstIssue, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      player_id,
      game_id,
      scoring_method,
      raw_score,
      awarded_points,
      idempotency_key,
    } = parsed.data;

    // Always derive the volunteer ID from the signed server-side session.
    const volunteerId = session.id;

    // If Supabase is configured, confirm the volunteer is still active.
    if (
      isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createAdminClient();

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", volunteerId)
        .eq("role", "volunteer")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Volunteer status check failed:", error);

        return NextResponse.json(
          { error: "Unable to verify volunteer status." },
          { status: 503 }
        );
      }

      if (!profile) {
        return NextResponse.json(
          {
            error:
              "Volunteer account is inactive or no longer exists. Please sign in again.",
          },
          { status: 401 }
        );
      }
    }

    const attempt = await DataStore.submitScore({
      player_id,
      game_id,
      volunteer_id: volunteerId,
      scoring_method,
      raw_score,
      awarded_points,
      idempotency_key,
    });

    return NextResponse.json({
      success: true,
      message: "Score successfully accepted and recorded!",
      attempt,
    });
  } catch (err: unknown) {
    console.error("Score submission failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to submit score.",
      },
      { status: 400 }
    );
  }
}
