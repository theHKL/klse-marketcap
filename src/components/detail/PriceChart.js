'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CHART_RANGES } from '@/lib/constants';

const TABS = [
  { key: 'price', label: 'Price' },
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'netIncome', label: 'Net Income' },
  { key: 'peRatio', label: 'P/E Ratio' },
  { key: 'psRatio', label: 'P/S Ratio' },
  { key: 'eps', label: 'EPS' },
];

const ETF_TABS = [
  { key: 'price', label: 'Price' },
  { key: 'aum', label: 'AUM' },
  { key: 'dividendYield', label: 'Div Yield' },
];

function fmtBig(value) {
  if (value == null) return '\u2014';
  if (Math.abs(value) >= 1e12) return `RM${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `RM${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `RM${(value / 1e6).toFixed(0)}M`;
  return `RM${Number(value).toLocaleString()}`;
}

function fmtRatio(value) {
  if (value == null) return '\u2014';
  return Number(value).toFixed(2);
}

function fmtPct(value) {
  if (value == null) return '\u2014';
  return `${(Number(value) * 100).toFixed(2)}%`;
}


export default function PriceChart({ initialData, symbol, incomeStatements, keyMetrics, etfHistory, securityType }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lcRef = useRef(null);
  const priceCacheRef = useRef(new Map([['1y', initialData || []]]));
  const [chartReady, setChartReady] = useState(false);
  const [activeTab, setActiveTab] = useState('price');
  const [timeRange, setTimeRange] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState(initialData || []);

  const isEtfOrFund = securityType === 'etf' || securityType === 'fund';
  const hasStockData = (incomeStatements && incomeStatements.length > 0) || (keyMetrics && keyMetrics.length > 0);

  const activeTabs = useMemo(() => {
    if (isEtfOrFund) return ETF_TABS;
    if (hasStockData) return TABS;
    return [{ key: 'price', label: 'Price' }];
  }, [isEtfOrFund, hasStockData]);

  const incomeData = useMemo(() => {
    return (incomeStatements || [])
      .map((d) => ({ date: d.date, revenue: d.revenue, netIncome: d.net_income, eps: d.eps }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [incomeStatements]);

  const metricsData = useMemo(() => {
    return (keyMetrics || [])
      .map((d) => ({
        date: d.date,
        marketCap: d.market_cap,
        peRatio: d.pe_ratio,
        psRatio: d.ps_ratio,
        dividendYield: d.dividend_yield,
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [keyMetrics]);

  const etfData = useMemo(() => {
    return (etfHistory || []).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [etfHistory]);

  const tabConfig = useMemo(() => {
    const latestIncome = incomeData[incomeData.length - 1];
    const latestMetrics = metricsData[metricsData.length - 1];
    const latestEtf = etfData[etfData.length - 1];

    switch (activeTab) {
      case 'price': {
        const last = priceData[priceData.length - 1];
        return {
          data: priceData.map((d) => ({ time: d.date, value: Number(d.close) })),
          type: 'area',
          color: '#42A5F5',
          latestValue: last ? `RM${Number(last.close).toFixed(2)}` : '\u2014',
        };
      }
      case 'marketCap':
        return {
          data: metricsData
            .filter((d) => d.marketCap != null)
            .map((d) => ({ time: d.date, value: Number(d.marketCap) })),
          type: 'area',
          color: '#42A5F5',
          latestValue: fmtBig(latestMetrics?.marketCap),
          priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
        };
      case 'revenue':
        return {
          data: incomeData
            .filter((d) => d.revenue != null)
            .map((d) => ({ time: d.date, value: Number(d.revenue) })),
          type: 'histogram',
          color: '#4A7FAD',
          latestValue: fmtBig(latestIncome?.revenue),
          priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
        };
      case 'netIncome':
        return {
          data: incomeData
            .filter((d) => d.netIncome != null)
            .map((d) => ({ time: d.date, value: Number(d.netIncome) })),
          type: 'histogram',
          color: '#557D48',
          latestValue: fmtBig(latestIncome?.netIncome),
          priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
        };
      case 'peRatio':
        return {
          data: metricsData
            .filter((d) => d.peRatio != null)
            .map((d) => ({ time: d.date, value: Number(d.peRatio) })),
          type: 'area',
          color: '#F2D98B',
          latestValue: fmtRatio(latestMetrics?.peRatio),
        };
      case 'psRatio':
        return {
          data: metricsData
            .filter((d) => d.psRatio != null)
            .map((d) => ({ time: d.date, value: Number(d.psRatio) })),
          type: 'area',
          color: '#C5B8D9',
          latestValue: fmtRatio(latestMetrics?.psRatio),
        };
      case 'eps': {
        const latestEps = latestIncome?.eps;
        return {
          data: incomeData
            .filter((d) => d.eps != null)
            .map((d) => ({ time: d.date, value: Number(d.eps) })),
          type: 'area',
          color: '#DC2626',
          latestValue: latestEps != null ? `RM${Number(latestEps).toFixed(2)}` : '\u2014',
        };
      }
      // ETF/fund-specific tabs
      case 'aum': {
        // ETFs: use key_metrics market_cap as AUM proxy (historical quarterly data)
        // Funds: use etf_metrics_history aum (accumulating daily snapshots)
        const useMarketCap = securityType === 'etf' && metricsData.some((d) => d.marketCap != null);
        if (useMarketCap) {
          return {
            data: metricsData
              .filter((d) => d.marketCap != null)
              .map((d) => ({ time: d.date, value: Number(d.marketCap) })),
            type: 'area',
            color: '#4A7FAD',
            latestValue: fmtBig(latestMetrics?.marketCap),
            priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
          };
        }
        return {
          data: etfData
            .filter((d) => d.aum != null)
            .map((d) => ({ time: d.date, value: Number(d.aum) })),
          type: 'area',
          color: '#4A7FAD',
          latestValue: fmtBig(latestEtf?.aum),
          priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
        };
      }
      case 'dividendYield': {
        // Use key_metrics dividend_yield (historical data already exists)
        const yieldData = metricsData
          .filter((d) => d.dividendYield != null)
          .map((d) => ({ time: d.date, value: Number(d.dividendYield) }));
        const latestYield = yieldData.length > 0 ? yieldData[yieldData.length - 1].value : null;
        return {
          data: yieldData,
          type: 'area',
          color: '#557D48',
          latestValue: fmtPct(latestYield),
          priceFormat: { type: 'custom', formatter: (v) => fmtPct(v), minMove: 0.000001 },
        };
      }
      default:
        return { data: [], type: 'area', color: '#42A5F5', latestValue: '\u2014' };
    }
  }, [activeTab, priceData, incomeData, metricsData, etfData, securityType]);

  // Create chart once on mount, dynamically importing lightweight-charts
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let cancelled = false;
    let handleResize;

    async function initChart() {
      const lc = await import('lightweight-charts');
      if (cancelled) return;
      lcRef.current = lc;

      const chart = lc.createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#FFFFFF' },
          textColor: '#94A3B8',
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: '#E2E8F0' },
          horzLines: { color: '#E2E8F0' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        handleScroll: false,
        handleScale: false,
        rightPriceScale: { borderColor: '#E2E8F0' },
        timeScale: { borderColor: '#E2E8F0' },
        crosshair: {
          vertLine: { color: '#94A3B8', labelBackgroundColor: '#475569' },
          horzLine: { color: '#94A3B8', labelBackgroundColor: '#475569' },
        },
      });

      chartRef.current = chart;

      handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      setChartReady(true);
    }

    initChart();

    return () => {
      cancelled = true;
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      lcRef.current = null;
      setChartReady(false);
    };
  }, []);

  // Update series when tab or data changes
  useEffect(() => {
    const chart = chartRef.current;
    const lc = lcRef.current;
    if (!chart || !lc) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (tabConfig.data.length === 0) return;

    let series;
    const formatOpts = tabConfig.priceFormat ? { priceFormat: tabConfig.priceFormat } : {};

    if (tabConfig.type === 'histogram') {
      series = chart.addSeries(lc.HistogramSeries, {
        color: tabConfig.color,
        priceLineVisible: false,
        ...formatOpts,
      });
    } else {
      series = chart.addSeries(lc.AreaSeries, {
        lineColor: tabConfig.color,
        topColor: `${tabConfig.color}40`,
        bottomColor: `${tabConfig.color}00`,
        lineWidth: 2,
        ...(activeTab !== 'price' && { priceLineVisible: false }),
        ...formatOpts,
      });
    }

    series.setData(tabConfig.data);
    chart.timeScale().fitContent();
    seriesRef.current = series;
  }, [tabConfig, activeTab, chartReady]);

  const handleRangeChange = useCallback(
    async (range) => {
      setTimeRange(range);

      // Serve from cache instantly if available
      if (priceCacheRef.current.has(range)) {
        setPriceData(priceCacheRef.current.get(range));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/prices/${symbol.toLowerCase()}?range=${range}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.prices?.length > 0) {
          priceCacheRef.current.set(range, json.prices);
          setPriceData(json.prices);
        }
      } catch (err) {
        console.error('PriceChart fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  return (
    <section aria-label={`${symbol} chart`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Charts</h2>
        {activeTab === 'price' && (
          <div className="flex gap-1.5" role="tablist" aria-label="Chart timeframe">
            {CHART_RANGES.map((range) => (
              <button
                key={range}
                role="tab"
                aria-selected={timeRange === range}
                onClick={() => handleRangeChange(range)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-primary-light text-white'
                    : 'bg-surface text-slate-400 hover:bg-slate-400/20'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="mt-3 flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Chart metric"
      >
        {activeTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-800 text-white'
                : 'bg-surface text-slate-400 hover:bg-slate-400/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-2 font-mono text-lg font-bold">{tabConfig.latestValue}</p>

      <div className="relative mt-2 rounded-2xl bg-white p-2 shadow-card">
        {loading && activeTab === 'price' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
          </div>
        )}
        <div ref={chartContainerRef} aria-label="Interactive chart" />
      </div>
    </section>
  );
}
