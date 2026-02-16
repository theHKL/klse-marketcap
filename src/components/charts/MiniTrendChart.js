'use client'

import { useRef, useEffect } from 'react'

const TREND_COLORS = {
  up: { line: '#1B7A5C', fill: '#B2DFD066' },
  down: { line: '#C44B3F', fill: '#E8A89866' },
  neutral: { line: '#3D7AAD', fill: '#C5DCEF66' },
}

export default function MiniTrendChart({
  title,
  data,
  latestValue,
  trend = 'neutral',
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) return

    let cancelled = false

    async function init() {
      const { createChart, AreaSeries } = await import('lightweight-charts')

      if (cancelled || !containerRef.current) return

      const colors = TREND_COLORS[trend] || TREND_COLORS.neutral

      const chart = createChart(containerRef.current, {
        height: 80,
        layout: {
          background: { color: 'transparent' },
          textColor: 'transparent',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        timeScale: {
          visible: false,
        },
        rightPriceScale: {
          visible: false,
        },
        leftPriceScale: {
          visible: false,
        },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
      })

      const series = chart.addSeries(AreaSeries, {
        lineColor: colors.line,
        topColor: colors.fill,
        bottomColor: 'transparent',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      })

      series.setData(data)
      chart.timeScale().fitContent()

      chartRef.current = chart

      // Responsive width
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
      }
    }
  }, [data, trend])

  const hasData = data && data.length > 0

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {title && (
        <p className="text-xs text-silver uppercase tracking-wide mb-1">
          {title}
        </p>
      )}
      <p className="text-xl font-semibold text-navy font-mono">
        {hasData ? latestValue : '\u2014'}
      </p>
      {hasData && <div ref={containerRef} className="mt-2 w-full" />}
    </div>
  )
}
