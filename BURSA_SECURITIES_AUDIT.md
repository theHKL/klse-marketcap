# Bursa Malaysia: Complete Tradable Securities Audit

> Deep-dive of all tradable securities listed on Bursa Malaysia, benchmarked against [klsescreener.com](https://www.klsescreener.com/v2/markets) and mapped to klsemarketcap.com coverage gaps.
>
> Last updated: 2026-02-23

---

## 1. Equities / Stocks (~1,056 listings)

| Market | Count | Description |
|--------|-------|-------------|
| **Main Market** | ~790 | Large and mid-cap companies |
| **ACE Market** | ~220 | Growth/small-cap companies |
| **LEAP Market** | ~46 | Sophisticated investors only (not publicly tradable) |

- Yahoo Finance classification: `quoteType: "EQUITY"`, suffix `.KL`
- LEAP Market securities do not appear in Yahoo's screener (correct — they are not publicly tradable)
- **App status:** Fully supported as `type: 'stock'`

---

## 2. REITs (~18 listings)

| REIT | Code | Sector | Shariah |
|------|------|--------|---------|
| Al-Aqar Healthcare REIT | 5116 | Healthcare | Yes |
| Al-Salam REIT | 5269 | Diversified | Yes |
| AmanahRaya REIT | 5127 | Diversified | Yes |
| AME REIT | 5307 | Industrial | — |
| AmFirst REIT | 5120 | Office/Retail | — |
| Atrium REIT | 5130 | Industrial | — |
| Axis REIT | 5106 | Industrial/Diversified | Yes |
| CapitaLand Malaysia Trust | 5180 | Retail | — |
| Hektar REIT | 5121 | Retail | — |
| IGB REIT | 5227 | Retail | — |
| IGB Commercial REIT | 5280 | Office/Commercial | — |
| KIP REIT | 5280 | Retail | — |
| KLCCP Stapled Group | 5235SS | Office/Retail/Hotel | — |
| Pavilion REIT | 5212 | Retail/Office | — |
| Sunway REIT | 5176 | Diversified | — |
| Tower REIT | 5111 | Office | — |
| UOA REIT | 5110 | Office | — |
| YTL Hospitality REIT | 5109 | Hospitality | — |

- Yahoo Finance classification: `quoteType: "EQUITY"` with `sector: "Real Estate"` and `industry` containing "REIT"
- REITs are NOT classified as a separate `quoteType` — they appear as equities
- **App status:** Currently mixed into `stock` type. **Not separately browsable.** This is the biggest gap.

---

## 3. ETFs (~17 listings)

| ETF | Code | Type | Shariah |
|-----|------|------|---------|
| ABF Malaysia Bond Index Fund | 0800EA | Fixed Income | No |
| FTSE Bursa Malaysia KLCI ETF | 0820EA | Equity | No |
| Principal FTSE ASEAN 40 | 0822EA | Equity | No |
| Eq8 DJ Islamic Market MY Titans 25 | 0823EA | Equity | Yes |
| Eq8 MSCI Malaysia Islamic Dividend | 0824EA | Equity | Yes |
| Eq8 MSCI SEA Islamic Dividend | 0825EA | Equity | Yes |
| TradePlus Shariah Gold Tracker | 0828EA | Commodity | Yes |
| TradePlus DWA Malaysia Momentum | 0829EA | Equity | Yes |
| VP-DJ Shariah China A-Shares 100 | 0827EA | Equity | Yes |
| FTSE4Good Bursa Malaysia | F4GBM-EA | Equity (ESG) | No |
| Kenanga KLCI Daily 2x Leveraged | 0836EA | Leveraged | No |
| Kenanga KLCI Daily (-1x) Inverse | 0837EA | Inverse | No |
| Eq8 DJ U.S. Titans 50 | — | Equity | Yes |
| TradePlus S&P New China Tracker | — | Equity | Yes |
| Principal FTSE ASEAN 40 Malaysia II | — | Equity | No |

Sub-types: Equity, Fixed Income (Bond), Commodity, Leveraged, Inverse, ESG

- Yahoo Finance classification: `quoteType: "ETF"`, suffix `.KL`
- **App status:** Fully supported as `type: 'etf'`

---

## 4. Structured Warrants (~1,091 listings)

Issued by 8 licensed investment banks:

| Issuer |
|--------|
| Macquarie Capital Securities |
| CIMB Investment Bank |
| Hong Leong Investment Bank |
| Kenanga Investment Bank |
| Maybank Investment Bank |
| RHB Investment Bank |
| UOB Kay Hian Securities |
| Affin Hwang Investment Bank |

Types:
- **Call Warrants** — bullish derivative on underlying equity/index
- **Put Warrants** — bearish derivative on underlying equity/index

Key data fields (from KLSE Screener warrant screener):
- Underlying security, maturity date, exercise price, gearing, premium, premium %, implied volatility, relative volume, Shariah compliance

- Yahoo Finance: typically excluded from the `region: MY` equity screener
- **App status:** NOT tracked. This is KLSE Screener's #2 feature after the stock screener.

---

## 5. Company Warrants (hundreds of listings)

- Ticker format: stock code + `-WA`, `-WB`, `-WC` etc. (e.g., `1155WA.KL` for Maybank warrants)
- Issued by listed companies themselves (not investment banks)
- Longer maturity than structured warrants
- Yahoo Finance: excluded from equity screener
- **App status:** NOT tracked

---

## 6. Special Vehicle Securities

| Type | Count | Example | Yahoo quoteType | App Status |
|------|-------|---------|-----------------|------------|
| **Stapled Securities** | 1 | KLCCP Stapled Group (5235SS) | EQUITY | Captured as stock |
| **SPAC** | 1 | — | EQUITY | May be in stocks |
| **Closed-End Fund** | 1 | iCapital.biz Berhad (5108) | EQUITY | Captured as stock |
| **Business Trust** | 1 | Prolintas Infra BT (listed March 2024) | EQUITY | May be in stocks |
| **ETBS** | 1 | Ihsan Sukuk | Not in screener | NOT tracked |

---

## 7. Market Indices & Benchmarks

### Malaysian Indices (tracked by KLSE Screener)

| Index | Description |
|-------|-------------|
| FTSE Bursa Malaysia KLCI | 30 largest companies (main benchmark) |
| FBM 70 | Next 70 companies after KLCI |
| FBM EMAS | KLCI + FBM 70 combined |
| FBM Hijrah | Shariah-compliant large/mid-cap |
| FBM ACE | ACE Market index |
| FBM Small Cap | Small-cap companies |

### Sector Indices

Consumer, Industrial, Construction, Technology, Financial Services, Property, Plantation, Energy, Healthcare, Telecom, Transportation, Utilities

### Regional Indices (shown on KLSE Screener market page)

Singapore STI, Hong Kong Hang Seng, South Korea KOSPI, Japan Nikkei 225, Thailand SET, Philippines PSEi, China indices, Australia ASX 200, Indonesia Composite, New Zealand NZX 50, Taiwan TSEC

### Commodities & Forex (shown on KLSE Screener)

- Commodities: Crude Palm Oil, Brent Oil, Crude Oil, Gold, Silver
- Forex: USD/MYR, SGD/MYR, EUR/MYR, GBP/MYR, JPY/MYR, AUD/MYR, CNY/MYR
- Crypto: Bitcoin, Ethereum

**App status:** Only KLCI (`^KLSE`) tracked in market overview. Commodities/forex/crypto are not Bursa-listed securities and are out of scope.

---

## 8. Shariah (Islamic) Compliance

A defining feature of the Malaysian market:

| Category | Shariah Count | Total | % |
|----------|--------------|-------|---|
| Stocks (i-Stocks) | ~850 | ~1,056 | ~80% |
| ETFs (i-ETFs) | 7 | ~17 | ~41% |
| REITs (i-REITs) | 4-5 | ~18 | ~22-28% |

- Securities Commission Malaysia publishes the Shariah-compliant list twice yearly (May and November)
- **App status:** NOT tracked. A Shariah badge/filter would be a major differentiator for Malaysian users.

---

## Current Coverage vs Opportunities

| Security Type | Bursa Count | klsemarketcap.com | Gap |
|---------------|-------------|-------------------|-----|
| Stocks (Main + ACE) | ~1,056 | Supported | None |
| ETFs | ~17 | Supported | None |
| REITs | ~18 | Mixed into stocks | **Add dedicated tab** |
| Structured Warrants | ~1,091 | Not tracked | **Big opportunity** |
| Company Warrants | ~200+ | Not tracked | Medium opportunity |
| Shariah badge | ~850 stocks | Not tracked | **Quick win** |
| Sector Indices | 12+ | Only KLCI | Could expand |
| Business Trust | 1 | May be in stocks | Tag it |
| SPAC | 1 | May be in stocks | Tag it |
| Closed-End Fund | 1 | In stocks | Fine as-is |
| ETBS | 1 | Not tracked | Skip for now |

---

## Recommended Implementation Priorities

### Tier 1 — High Value, Easy to Add

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **REITs tab** | Low | High | Filter existing stocks by `sector = 'Real Estate'` AND `industry ILIKE '%REIT%'`. No new sync needed — data already exists. Show dividend yield prominently. |
| **Shariah-compliant badge** | Low-Medium | High | Add `is_shariah BOOLEAN` to securities table. Populate from SC Malaysia's published list or infer from Yahoo data. ~80% of KLSE stocks are Shariah-compliant — this matters enormously to Malaysian investors. |

### Tier 2 — Medium Value, Moderate Effort

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Warrant Screener** | High | High | New `warrants` DB table + dedicated sync. Yahoo search for `.KL` warrants with `-W`/`-C` suffix patterns, or scrape Bursa data. Key fields: underlying, maturity, exercise price, gearing, premium. KLSE Screener's #2 feature. |
| **Expanded Market Indices** | Low-Medium | Medium | Add FBM70, FBM EMAS, sector indices to market overview via `yahoo.quote()`. Users want sector performance at a glance. |
| **ETF sub-type classification** | Low | Low-Medium | Add `etf_type` field: equity, bond, commodity, leveraged, inverse, ESG. Already have the data from Yahoo, just need to classify. |

### Tier 3 — Low Volume, Nice to Have

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Business Trust tag** | Minimal | Low | Prolintas Infra BT — manually tag or auto-detect |
| **SPAC tag** | Minimal | Low | Only 1 listing currently |
| **ETBS** | Medium | Very Low | Only 1-2 listings, niche, low liquidity |

### Out of Scope

- Commodities / Forex / Crypto — not Bursa-listed securities
- News / Announcements — different product category
- Financial report deep analysis — different scope from a market cap screener

---

## Sources

- [Bursa Malaysia - Products & Services](https://www.bursamalaysia.com/trade/market/securities_market)
- [Bursa Malaysia - ETF Overview](https://www.bursamalaysia.com/trade/our_products_services/equities/exchange_traded_funds/overview)
- [BursaMKTPLC - ETFs](https://www.bursamarketplace.com/mkt/themarket/etf)
- [Bursa Malaysia - Shariah ETFs](https://www.bursamalaysia.com/trade/our_products_services/islamic_market/bursa_malaysia_i/shariah_compliant_exchange_traded_funds)
- [Bursa Malaysia - Stapled Securities](https://www.bursamalaysia.com/trade/our_products_services/equities/stapled_securities)
- [Capital Markets Malaysia - Public Equities](https://www.capitalmarketsmalaysia.com/public-equities/)
- [KLSE Screener](https://www.klsescreener.com/v2/)
- [KLSE Screener - Warrant Screener](https://www.klsescreener.com/v2/screener-warrants)
- [M-REIT Data (Fifth Person)](https://mreit.fifthperson.com/)
- [REIT Pulse - All Malaysia REITs](https://reitpulse.com/getting-to-know-all-the-malaysia-reits/)
- [Ringgit Oh Ringgit - ETFs on Bursa Malaysia](https://ringgitohringgit.com/investing/etf-on-bursa-malaysia/)
- [Bursa Malaysia ASEAN 2025 Presentation](https://bursa.listedcompany.com/misc/presentation_slide_asean_2025.pdf)
