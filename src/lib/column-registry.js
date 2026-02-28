/**
 * Column Registry — single source of truth for all screener columns.
 *
 * Each column defines:
 *   id          – stable key stored in cookie
 *   label       – display header text
 *   field       – database column (null = not sortable)
 *   category    – group in customizer modal (null = fixed column)
 *   renderType  – cell renderer key
 *   align       – 'left' | 'center' | 'right'
 *   width       – Tailwind width class
 *   sortable    – whether the column header is clickable to sort
 *   defaultVisible – included in default column set
 *   fixed       – always shown, never in customizer
 *   frozen      – sticky on the left when scrolling horizontally
 *   stickyLeft  – pixel offset for `left` when frozen
 *   alwaysLast  – pinned to far-right (sparkline)
 */

export const MAX_VISIBLE_COLUMNS = 12;

/** Total pixel width of frozen columns on mobile: rank(48) + symbol(100) */
export const FROZEN_COLUMNS_WIDTH_MOBILE = 148;
/** Total pixel width of frozen columns on md+: rank(48) + symbol(100) + name(160) */
export const FROZEN_COLUMNS_WIDTH = 308;

export const COLUMN_REGISTRY = [
  // ── Fixed columns (always visible, not toggleable) ──
  {
    id: 'rank',
    label: '#',
    field: null,
    category: null,
    renderType: 'rank',
    align: 'center',
    width: 'w-16 min-w-[64px]',
    sortable: false,
    defaultVisible: true,
    fixed: true,
    frozen: true,
    stickyLeft: 0,
    alwaysLast: false,
  },
  {
    id: 'symbol',
    label: 'Symbol',
    field: null,
    category: null,
    renderType: 'symbol',
    align: 'left',
    width: 'w-[100px] min-w-[100px]',
    sortable: false,
    defaultVisible: true,
    fixed: true,
    frozen: true,
    stickyLeft: 64,
    alwaysLast: false,
  },

  // ── Core ──
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    category: 'Core',
    renderType: 'name',
    align: 'left',
    width: 'w-[160px] min-w-[160px]',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    frozen: true,
    frozenBreakpoint: 'md',
    stickyLeft: 148,
    alwaysLast: false,
  },
  {
    id: 'sector',
    label: 'Sector',
    field: 'sector',
    category: 'Core',
    renderType: 'badge',
    align: 'left',
    width: 'w-[140px]',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'market_cap',
    label: 'Market Cap',
    field: 'market_cap',
    category: 'Core',
    renderType: 'market_cap',
    align: 'center',
    width: 'w-[120px]',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'price',
    label: 'Price',
    field: 'price',
    category: 'Core',
    renderType: 'price',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'volume',
    label: 'Volume',
    field: 'volume',
    category: 'Core',
    renderType: 'volume',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },

  // ── Price Change ──
  {
    id: 'change_1d',
    label: '1D',
    field: 'change_1d_pct',
    category: 'Price Change',
    renderType: 'change_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'change_7d',
    label: '7D',
    field: 'change_7d_pct',
    category: 'Price Change',
    renderType: 'change_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'change_1y',
    label: '1Y',
    field: 'change_1y_pct',
    category: 'Price Change',
    renderType: 'change_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'change_5y',
    label: '5Y',
    field: 'change_5y_pct',
    category: 'Price Change',
    renderType: 'change_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: true,
    fixed: false,
    alwaysLast: false,
  },

  // ── Fundamentals ──
  {
    id: 'pe_ratio',
    label: 'P/E',
    field: 'pe_ratio',
    category: 'Fundamentals',
    renderType: 'ratio',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'eps',
    label: 'EPS',
    field: 'eps',
    category: 'Fundamentals',
    renderType: 'ratio',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'dividend_yield',
    label: 'Div Yield',
    field: 'dividend_yield',
    category: 'Fundamentals',
    renderType: 'yield_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'beta',
    label: 'Beta',
    field: 'beta',
    category: 'Fundamentals',
    renderType: 'ratio',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },

  // ── Range ──
  {
    id: 'year_high',
    label: '52W High',
    field: 'year_high',
    category: 'Range',
    renderType: 'price',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'year_low',
    label: '52W Low',
    field: 'year_low',
    category: 'Range',
    renderType: 'price',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'price_avg_50',
    label: '50D MA',
    field: 'price_avg_50',
    category: 'Range',
    renderType: 'price',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'price_avg_200',
    label: '200D MA',
    field: 'price_avg_200',
    category: 'Range',
    renderType: 'price',
    align: 'center',
    width: 'w-[100px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },

  // ── Fund ──
  {
    id: 'aum',
    label: 'AUM',
    field: 'aum',
    category: 'Fund',
    renderType: 'market_cap',
    align: 'center',
    width: 'w-[120px]',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },
  {
    id: 'expense_ratio',
    label: 'Expense Ratio',
    field: 'expense_ratio',
    category: 'Fund',
    renderType: 'raw_pct',
    align: 'center',
    width: 'w-20',
    sortable: true,
    defaultVisible: false,
    fixed: false,
    alwaysLast: false,
  },

  // ── Charts (always last) ──
  {
    id: 'sparkline',
    label: '7D Chart',
    field: null,
    category: 'Charts',
    renderType: 'sparkline',
    align: 'center',
    width: 'w-[112px]',
    sortable: false,
    defaultVisible: true,
    fixed: false,
    alwaysLast: true,
  },
];

/** IDs of columns visible by default (non-fixed, toggleable) */
export const DEFAULT_VISIBLE_IDS = COLUMN_REGISTRY
  .filter((c) => c.defaultVisible && !c.fixed)
  .map((c) => c.id);

/** Per-type default visible column overrides */
export const DEFAULT_VISIBLE_IDS_BY_TYPE = {
  etf: ['name', 'aum', 'expense_ratio', 'price', 'change_1d', 'change_7d', 'change_1y', 'sparkline'],
  fund: ['name', 'aum', 'expense_ratio', 'price', 'change_1d', 'change_7d', 'change_1y', 'sparkline'],
};

/** Ordered list of category names for the customizer modal */
export const COLUMN_CATEGORIES = [
  'Core',
  'Price Change',
  'Fundamentals',
  'Fund',
  'Range',
  'Charts',
];

/** Look up a column definition by its id */
export function getColumnById(id) {
  return COLUMN_REGISTRY.find((c) => c.id === id) || null;
}

/**
 * Build the active columns array from a set of visible IDs.
 * Fixed columns are always included. alwaysLast columns are appended at the end.
 * The order of visibleIds determines column display order.
 */
export function buildActiveColumns(visibleIds) {
  const colMap = new Map(COLUMN_REGISTRY.map((c) => [c.id, c]));

  const fixed = COLUMN_REGISTRY.filter((c) => c.fixed);
  const normal = visibleIds
    .map((id) => colMap.get(id))
    .filter((c) => c && !c.fixed && !c.alwaysLast);
  const last = visibleIds
    .map((id) => colMap.get(id))
    .filter((c) => c && c.alwaysLast);

  return [...fixed, ...normal, ...last];
}
