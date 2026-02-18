import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getAuthUrl } from "@/lib/gmail";

/**
 * GET /api/gmail/auth?scopes=calendar
 * Generates a Google OAuth consent URL and redirects the user to it.
 * The user's ID is passed through the state parameter for CSRF-like validation.
 * Optional query param: scopes=calendar to include Calendar scopes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCalendar = searchParams.get("scopes") === "calendar";

    const url = getAuthUrl(user.id, includeCalendar);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Gmail auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate Gmail auth" },
      { status: 500 }
    );
  }
}
