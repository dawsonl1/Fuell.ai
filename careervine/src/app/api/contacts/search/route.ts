import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceClient } from "@/lib/supabase/service-client";

/**
 * GET /api/contacts/search?q=...
 * Search contacts by name, return name + primary email for autocomplete.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) return NextResponse.json({ contacts: [] });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return NextResponse.json({ contacts: [] });

    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("contacts")
      .select("id, name, contact_emails(email, is_primary)")
      .eq("user_id", user.id)
      .ilike("name", `%${q}%`)
      .limit(8);

    if (error) throw error;

    const results = (data || []).map((c) => {
      const emails = c.contact_emails as unknown as Array<{ email: string | null; is_primary: boolean }> | null;
      const primary = emails?.find((e) => e.is_primary)?.email;
      const fallback = emails?.[0]?.email;
      return {
        id: c.id,
        name: c.name,
        email: primary || fallback || null,
      };
    }).filter((c) => c.email);

    return NextResponse.json({ contacts: results });
  } catch (error) {
    console.error("Contact search error:", error);
    return NextResponse.json({ contacts: [] });
  }
}
