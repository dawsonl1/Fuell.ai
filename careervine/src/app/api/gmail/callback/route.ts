import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { exchangeCodeForTokens } from "@/lib/gmail";

/**
 * GET /api/gmail/callback
 * Handles the OAuth redirect from Google. Exchanges the authorization code
 * for tokens, stores them, and redirects back to settings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail=error&reason=${encodeURIComponent(errorParam)}`
      );
    }

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate that the state matches the current user
    if (state !== user.id) {
      return NextResponse.json({ error: "State mismatch" }, { status: 403 });
    }

    await exchangeCodeForTokens(code, user.id);

    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/settings?gmail=connected`);
  } catch (error) {
    console.error("Gmail callback error:", error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/settings?gmail=error&reason=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error"
      )}`
    );
  }
}
