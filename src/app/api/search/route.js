import { createServerClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 1) return Response.json([]);

  const sanitized = q.replace(/[%_]/g, "");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("securities")
    .select("symbol, name, type, logo_url, price, change_1d_pct, market_cap")
    .eq("is_actively_trading", true)
    .or(`symbol.ilike.${sanitized}%,name.ilike.%${sanitized}%`)
    .order("market_cap", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) return Response.json([], { status: 500 });
  return Response.json(data || []);
}
