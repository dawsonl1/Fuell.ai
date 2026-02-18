import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getAuthUrl } from "@/lib/gmail";

/**
 * GET /api/gmail/auth
 * Generates a Google OAuth consent URL and redirects the user to it.
 * The user's ID is passed through the state parameter for CSRF-like validation.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = getAuthUrl(user.id);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Gmail auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate Gmail auth" },
      { status: 500 }
    );
  }
}
