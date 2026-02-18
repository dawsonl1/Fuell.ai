import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceClient } from "@/lib/supabase/service-client";
import { getConnection } from "@/lib/gmail";

/**
 * GET /api/gmail/inbox
 * Returns all email messages for the user (across every contact),
 * all pending scheduled emails, and all active follow-up sequences.
 * Used by the unified Inbox page.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await getConnection(user.id);
    if (!conn) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const service = createSupabaseServiceClient();

    const [emailsRes, scheduledRes, followUpsRes, contactsRes] = await Promise.all([
      service
        .from("email_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500),

      service
        .from("scheduled_emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("scheduled_send_at", { ascending: true }),

      service
        .from("email_follow_ups")
        .select("*, email_follow_up_messages(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),

      // Lightweight contact lookup: id → name
      service
        .from("contacts")
        .select("id, name")
        .eq("user_id", user.id),
    ]);

    if (emailsRes.error) throw emailsRes.error;
    if (scheduledRes.error) throw scheduledRes.error;
    if (followUpsRes.error) throw followUpsRes.error;

    const contactMap: Record<number, string> = {};
    for (const c of contactsRes.data || []) {
      contactMap[c.id] = c.name;
    }

    return NextResponse.json({
      success: true,
      emails: emailsRes.data || [],
      scheduledEmails: scheduledRes.data || [],
      followUps: followUpsRes.data || [],
      contactMap,
      gmailAddress: conn.gmail_address,
    });
  } catch (error) {
    console.error("Inbox API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load inbox" },
      { status: 500 },
    );
  }
}
