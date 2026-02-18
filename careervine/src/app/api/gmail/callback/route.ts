import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceClient } from "@/lib/supabase/service-client";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { google } from "googleapis";

/**
 * GET /api/gmail/callback
 * Handles the OAuth redirect from Google. Exchanges the authorization code
 * for tokens, stores them, and redirects back to settings.
 * Also detects if calendar scopes were granted.
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

    // Check if calendar scopes were granted
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    const grantedScopes = tokens.scope?.split(" ") || [];
    const calendarGranted = grantedScopes.some(s => s.includes("calendar"));

    // Update calendar_scopes_granted flag
    if (calendarGranted) {
      const serviceClient = createSupabaseServiceClient();
      await serviceClient
        .from("gmail_connections")
        .update({ calendar_scopes_granted: true })
        .eq("user_id", user.id);
    }

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
