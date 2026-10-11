
import { NextRequest, NextResponse } from "next/server";
import { pinVerificationSchema } from "@/lib/validation/schemas";
import { verifyEventPin } from "@/lib/auth/pin";
import {
  isSupabaseConfigured,
  createAdminClient,
} from "@/lib/supabase/server";
import { createVolunteerSession } from "@/lib/auth/volunteer-session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = pinVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid PIN payload" },
        { status: 400 }
      );
    }

    const {
      role,
      pin,
      volunteerName,
      volunteerCode,
    } = parsed.data;

    const isValid = await verifyEventPin(role, pin);

    if (!isValid) {
      return NextResponse.json(
        {
          error: `Incorrect ${role === "admin" ? "6-digit Admin" : "4-digit Volunteer"} PIN`,
        },
        { status: 401 }
      );
    }

    let volunteer:
      | { id: string; code: string; name: string }
      | undefined;

    let sessionToken: string | undefined;

    if (role === "volunteer") {
      if (!volunteerName?.trim() || !volunteerCode?.trim()) {
        return NextResponse.json(
          { error: "Your volunteer name and staff code are required." },
          { status: 400 }
        );
      }

      if (
        !isSupabaseConfigured() ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        return NextResponse.json(
          { error: "Volunteer verification is not configured." },
          { status: 503 }
        );
      }

      const supabase = createAdminClient();
      const normalizedCode = volunteerCode.trim().toUpperCase();

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, display_name, volunteer_code, role, is_active")
        .eq("volunteer_code", normalizedCode)
        .eq("role", "volunteer")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Volunteer profile lookup failed:", error);
        return NextResponse.json(
          { error: "Unable to verify volunteer details." },
          { status: 500 }
        );
      }

      if (!profile) {
        return NextResponse.json(
          { error: "Staff code not found or volunteer is inactive." },
          { status: 401 }
        );
      }

      if (
        profile.display_name.trim().toLowerCase() !==
        volunteerName.trim().toLowerCase()
      ) {
        return NextResponse.json(
          { error: "The name does not match the registered staff code." },
          { status: 401 }
        );
      }

      volunteer = {
        id: profile.id,
        code: profile.volunteer_code || normalizedCode,
        name: profile.display_name,
      };

      sessionToken = createVolunteerSession({
        id: volunteer.id,
        code: volunteer.code,
        name: volunteer.name,
      });
    }

    const response = NextResponse.json({
      success: true,
      role,
      message: `Verified ${role} event access PIN`,
      volunteer: volunteer
        ? { code: volunteer.code, name: volunteer.name }
        : undefined,
    });

    response.cookies.set(`retro_${role}_pin_verified`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
      path: "/",
    });

    if (sessionToken) {
      response.cookies.set("retro_volunteer_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 12,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("PIN verification failed:", err);

    return NextResponse.json(
      { error: "Internal server error during PIN verification." },
      { status: 500 }
    );
  }
}
