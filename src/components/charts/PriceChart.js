'use client'

import { useRef, useEffect, useState } from 'react'

const DEFAULT_TIMEFRAMES = ['1D', '7D', '1M', '3M', '6M', '1Y', '5Y', 'All']

const COLORS = {
  teal: '#1B7A5C',
  coral: '#C44B3F',
  mintAlpha: '#B2DFD066',
  coralLightAlpha: '#E8A89866',
  navy: '#1C3D5A',
  silver: '#94A3B8',
  gridLine: '#EAF0F7',
}

export default function PriceChart({
  data,
  timeframes = DEFAULT_TIMEFRAMES,
  onTimeframeChange,
  activeTimeframe,
  height = 400,
  positive = true,
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [chartReady, setChartReady] = useState(false)

  // Create chart on mount
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { createChart, AreaSeries, CandlestickSeries } = await import('lightweight-charts')

      if (cancelled || !containerRef.current) return

      const chart = createChart(containerRef.current, {
        height,
        layout: {
          background: { color: '#FFFFFF' },
          textColor: COLORS.navy,
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: COLORS.gridLine },
          horzLines: { color: COLORS.gridLine },
        },
        timeScale: {
          borderColor: COLORS.silver,
        },
        rightPriceScale: {
          borderColor: COLORS.silver,
        },
        crosshair: {
          vertLine: {
            labelBackgroundColor: COLORS.navy,
          },
          horzLine: {
            labelBackgroundColor: COLORS.navy,
          },
        },
      })

      chartRef.current = chart
      // Store series constructors for data updates
      chartRef.current._AreaSeries = AreaSeries
      chartRef.current._CandlestickSeries = CandlestickSeries

      chart.timeScale().fitContent()

      // ResizeObserver for responsiveness
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect
          if (width > 0) {
            chart.applyOptions({ width })
          }
        }
      })
      ro.observe(containerRef.current)
      chartRef.current._ro = ro

      if (!cancelled) setChartReady(true)
    }

    init()

    return () => {
      cancelled = true
      if (chartRef.current) {
        if (chartRef.current._ro) {
          chartRef.current._ro.disconnect()
        }
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [height])

  // Update data and colours whenever data or positive changes
  useEffect(() => {
    if (!chartReady || !chartRef.current || !data || data.length === 0) return

    const chart = chartRef.current
    const isCandlestick = data[0] && 'open' in data[0]

    // Remove existing series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

    if (isCandlestick) {
      const series = chart.addSeries(chart._CandlestickSeries, {
        upColor: COLORS.teal,
        downColor: COLORS.coral,
        borderUpColor: COLORS.teal,
        borderDownColor: COLORS.coral,
        wickUpColor: COLORS.teal,
        wickDownColor: COLORS.coral,
      })
      series.setData(data)
      seriesRef.current = series
    } else {
      const lineColor = positive ? COLORS.teal : COLORS.coral
      const topColor = positive ? COLORS.mintAlpha : COLORS.coralLightAlpha

      const series = chart.addSeries(chart._AreaSeries, {
        lineColor,
        topColor,
        bottomColor: 'transparent',
        lineWidth: 2,
      })
      series.setData(data)
      seriesRef.current = series
    }

    chart.timeScale().fitContent()
  }, [data, positive, chartReady])

  // Loading skeleton
  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex gap-2 mb-4">
          {DEFAULT_TIMEFRAMES.map((tf) => (
            <div key={tf} className="h-7 w-10 rounded-full bg-mist animate-pulse" />
          ))}
        </div>
        <div
          className="bg-mist rounded-xl animate-pulse"
          style={{ height: `${height}px` }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Timeframe buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {timeframes.map((tf) => {
          const isActive = tf === activeTimeframe
          return (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-sky text-white'
                  : 'bg-mist text-slate hover:bg-frost'
              }`}
            >
              {tf}
            </button>
          )
        })}
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
