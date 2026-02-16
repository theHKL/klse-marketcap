import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE } from "@/lib/constants";

function getClient() {
  return createServerClient();
}

/**
 * Paginated screener query with optional type, sector, sort, search filters.
 */
export const getSecurities = cache(
  async ({
    type,
    sector,
    sort = "market_cap",
    order = "desc",
    page = 1,
    limit = ITEMS_PER_PAGE,
    search,
  } = {}) => {
    try {
      const supabase = getClient();
      let query = supabase
        .from("securities")
        .select(
          "id, symbol, fmp_symbol, name, type, sector, industry, logo_url, price, change_1d, change_1d_pct, change_7d_pct, volume, market_cap",
          { count: "exact" }
        )
        .eq("is_actively_trading", true);

      if (type) query = query.eq("type", type);
      if (sector) query = query.eq("sector", sector);
      if (search) {
        query = query.or(
          `symbol.ilike.${search}%,name.ilike.%${search}%`
        );
      }

      const ascending = order === "asc";
      query = query.order(sort, { ascending, nullsFirst: false });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error("getSecurities error:", error.message);
        return { data: [], count: 0 };
      }
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error("getSecurities exception:", err);
      return { data: [], count: 0 };
    }
  }
);

/**
 * Get a single security by symbol (case-insensitive).
 */
export const getSecurityBySymbol = cache(async (symbol) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("securities")
      .select("*")
      .ilike("symbol", symbol)
      .single();

    if (error) {
      console.error("getSecurityBySymbol error:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("getSecurityBySymbol exception:", err);
    return null;
  }
});

/**
 * Get daily prices for a security, ordered newest first.
 */
export const getDailyPrices = cache(async (securityId, days = 365) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("daily_prices")
      .select("date, open, high, low, close, volume, change, change_percent")
      .eq("security_id", securityId)
      .order("date", { ascending: false })
      .limit(days);

    if (error) {
      console.error("getDailyPrices error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getDailyPrices exception:", err);
    return [];
  }
});

/**
 * Get income statements for a security (annual, last 5 years).
 */
export const getIncomeStatements = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("income_statements")
      .select("*")
      .eq("security_id", securityId)
      .eq("period", "FY")
      .order("date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("getIncomeStatements error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getIncomeStatements exception:", err);
    return [];
  }
});

/**
 * Get balance sheets for a security (annual, last 5 years).
 */
export const getBalanceSheets = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("balance_sheets")
      .select("*")
      .eq("security_id", securityId)
      .eq("period", "FY")
      .order("date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("getBalanceSheets error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getBalanceSheets exception:", err);
    return [];
  }
});

/**
 * Get cash flow statements for a security (annual, last 5 years).
 */
export const getCashFlows = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("cash_flow_statements")
      .select("*")
      .eq("security_id", securityId)
      .eq("period", "FY")
      .order("date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("getCashFlows error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getCashFlows exception:", err);
    return [];
  }
});

/**
 * Get key metrics for a security (last 5 years).
 */
export const getKeyMetrics = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("key_metrics")
      .select("*")
      .eq("security_id", securityId)
      .order("date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("getKeyMetrics error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getKeyMetrics exception:", err);
    return [];
  }
});

/**
 * Get stock peers joined with their current securities data.
 */
export const getStockPeers = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data: peers, error: peersError } = await supabase
      .from("stock_peers")
      .select("peer_fmp_symbol")
      .eq("security_id", securityId);

    if (peersError || !peers || peers.length === 0) return [];

    const peerSymbols = peers.map((p) => p.peer_fmp_symbol);
    const { data, error } = await supabase
      .from("securities")
      .select(
        "id, symbol, name, type, sector, logo_url, price, change_1d_pct, market_cap"
      )
      .in("fmp_symbol", peerSymbols)
      .eq("is_actively_trading", true)
      .order("market_cap", { ascending: false })
      .limit(8);

    if (error) {
      console.error("getStockPeers securities error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getStockPeers exception:", err);
    return [];
  }
});

/**
 * Get ETF-specific details.
 */
export const getETFDetails = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("etf_details")
      .select("*")
      .eq("security_id", securityId)
      .single();

    if (error) {
      console.error("getETFDetails error:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("getETFDetails exception:", err);
    return null;
  }
});

/**
 * Get ETF holdings ordered by weight.
 */
export const getETFHoldings = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("etf_holdings")
      .select("*")
      .eq("etf_security_id", securityId)
      .order("weight_percentage", { ascending: false });

    if (error) {
      console.error("getETFHoldings error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getETFHoldings exception:", err);
    return [];
  }
});

/**
 * Get ETF sector weights ordered by weight.
 */
export const getETFSectorWeights = cache(async (securityId) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("etf_sector_weights")
      .select("sector, weight_percentage")
      .eq("security_id", securityId)
      .order("weight_percentage", { ascending: false });

    if (error) {
      console.error("getETFSectorWeights error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getETFSectorWeights exception:", err);
    return [];
  }
});

/**
 * Get sector stats: company count and total market cap per sector.
 */
export const getSectorStats = cache(async () => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("securities")
      .select("sector, market_cap, symbol, name, logo_url, price, change_1d_pct")
      .eq("type", "stock")
      .eq("is_actively_trading", true)
      .not("sector", "is", null)
      .order("market_cap", { ascending: false });

    if (error) {
      console.error("getSectorStats error:", error.message);
      return [];
    }

    const sectorMap = {};
    for (const row of data || []) {
      if (!sectorMap[row.sector]) {
        sectorMap[row.sector] = {
          sector: row.sector,
          count: 0,
          totalMarketCap: 0,
          topCompanies: [],
          avgChange1d: 0,
          changeSum: 0,
        };
      }
      const s = sectorMap[row.sector];
      s.count++;
      s.totalMarketCap += Number(row.market_cap) || 0;
      s.changeSum += Number(row.change_1d_pct) || 0;
      if (s.topCompanies.length < 3) {
        s.topCompanies.push({
          symbol: row.symbol,
          name: row.name,
          logo_url: row.logo_url,
          price: row.price,
          change_1d_pct: row.change_1d_pct,
        });
      }
    }

    return Object.values(sectorMap).map((s) => ({
      ...s,
      avgChange1d: s.count > 0 ? s.changeSum / s.count : 0,
    }));
  } catch (err) {
    console.error("getSectorStats exception:", err);
    return [];
  }
});

/**
 * Type-ahead search for securities by symbol or name.
 */
export const searchSecurities = cache(async (query, limit = 10) => {
  try {
    if (!query || query.length < 1) return [];
    const supabase = getClient();
    const sanitized = query.replace(/[%_]/g, "");
    const { data, error } = await supabase
      .from("securities")
      .select(
        "symbol, name, type, logo_url, price, change_1d_pct, market_cap"
      )
      .eq("is_actively_trading", true)
      .or(`symbol.ilike.${sanitized}%,name.ilike.%${sanitized}%`)
      .order("market_cap", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error("searchSecurities error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("searchSecurities exception:", err);
    return [];
  }
});

/**
 * Get all symbols for generateStaticParams.
 */
export const getAllSymbols = cache(async (type) => {
  try {
    const supabase = getClient();
    let query = supabase
      .from("securities")
      .select("symbol")
      .eq("is_actively_trading", true);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      console.error("getAllSymbols error:", error.message);
      return [];
    }
    return (data || []).map((row) => row.symbol.toLowerCase());
  } catch (err) {
    console.error("getAllSymbols exception:", err);
    return [];
  }
});
