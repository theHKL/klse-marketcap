'use client';

import { useRef, useEffect } from 'react';
import { createChart, AreaSeries, HistogramSeries } from 'lightweight-charts';

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

function TrendCard({ title, latestValue, data, color = '#A8C6A0', isBar = false, priceFormat }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#94A3B8',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#E2E8F0' },
      },
      width: containerRef.current.clientWidth,
      height: 120,
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    const sortedData = [...data].sort((a, b) => (a.time > b.time ? 1 : -1));

    const formatOpts = priceFormat ? { priceFormat } : {};

    if (isBar) {
      const series = chart.addSeries(HistogramSeries, {
        color,
        priceLineVisible: false,
        ...formatOpts,
      });
      series.setData(sortedData);
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: `${color}40`,
        bottomColor: `${color}00`,
        lineWidth: 2,
        priceLineVisible: false,
        ...formatOpts,
      });
      series.setData(sortedData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, color, isBar, priceFormat]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-slate-400">{title}</p>
      <p className="mt-1 font-mono text-lg font-bold">{latestValue}</p>
      <div ref={containerRef} className="mt-2" aria-label={`${title} trend chart`} />
    </div>
  );
}

export default function FinancialCharts({ incomeStatements, keyMetrics }) {
  const incomeData = (incomeStatements || [])
    .map((d) => ({ date: d.date, revenue: d.revenue, netIncome: d.net_income, eps: d.eps }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const metricsData = (keyMetrics || [])
    .map((d) => ({
      date: d.date,
      marketCap: d.market_cap,
      peRatio: d.pe_ratio,
      psRatio: d.ps_ratio,
      eps: d.eps,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const latestIncome = incomeData[incomeData.length - 1];
  const latestMetrics = metricsData[metricsData.length - 1];

  const charts = [
    {
      title: 'Market Cap History',
      latestValue: fmtBig(latestMetrics?.marketCap),
      data: metricsData.filter((d) => d.marketCap != null).map((d) => ({ time: d.date, value: Number(d.marketCap) })),
      color: '#42A5F5',
      priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
    },
    {
      title: 'Revenue',
      latestValue: fmtBig(latestIncome?.revenue),
      data: incomeData.filter((d) => d.revenue != null).map((d) => ({ time: d.date, value: Number(d.revenue) })),
      color: '#4A7FAD',
      isBar: true,
      priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
    },
    {
      title: 'Net Income',
      latestValue: fmtBig(latestIncome?.netIncome),
      data: incomeData.filter((d) => d.netIncome != null).map((d) => ({ time: d.date, value: Number(d.netIncome) })),
      color: '#557D48',
      isBar: true,
      priceFormat: { type: 'custom', formatter: fmtBig, minMove: 1 },
    },
    {
      title: 'P/E Ratio',
      latestValue: fmtRatio(latestMetrics?.peRatio),
      data: metricsData.filter((d) => d.peRatio != null).map((d) => ({ time: d.date, value: Number(d.peRatio) })),
      color: '#F2D98B',
    },
    {
      title: 'P/S Ratio',
      latestValue: fmtRatio(latestMetrics?.psRatio),
      data: metricsData.filter((d) => d.psRatio != null).map((d) => ({ time: d.date, value: Number(d.psRatio) })),
      color: '#C5B8D9',
    },
    {
      title: 'EPS',
      latestValue: latestIncome?.eps != null ? `RM${Number(latestIncome.eps).toFixed(2)}` : '\u2014',
      data: incomeData.filter((d) => d.eps != null).map((d) => ({ time: d.date, value: Number(d.eps) })),
      color: '#DC2626',
    },
  ];

  if (charts.every((c) => c.data.length === 0)) return null;

  return (
    <section aria-label="Financial trend charts">
      <h2 className="text-xl font-bold">Financial Trends</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {charts.map((chart) => (
          <TrendCard key={chart.title} {...chart} />
        ))}
      </div>
    </section>
  );
}
