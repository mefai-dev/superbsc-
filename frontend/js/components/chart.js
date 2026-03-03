// MEFAI Chart — TradingView lightweight-charts wrapper

export function createChart(container, data, options = {}) {
  // Check if lightweight-charts is loaded
  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<div class="panel-loading">Charts library not loaded</div>';
    return null;
  }

  const theme = document.documentElement.getAttribute('data-theme');
  const isDark = theme === 'dark';

  const chartOptions = {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: isDark ? '#111111' : '#fafafa' },
      textColor: isDark ? '#e0e0e0' : '#1a1a1a',
      fontFamily: "'SF Mono', monospace",
      fontSize: 10,
    },
    grid: {
      vertLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' },
      horzLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' },
    },
    crosshair: { mode: 0 },
    timeScale: {
      borderColor: isDark ? '#2a2a2a' : '#e0e0e0',
      timeVisible: true,
    },
    rightPriceScale: {
      borderColor: isDark ? '#2a2a2a' : '#e0e0e0',
    },
    ...options,
  };

  const chart = LightweightCharts.createChart(container, chartOptions);

  const candleSeries = chart.addCandlestickSeries({
    upColor: '#00c087',
    downColor: '#e74c3c',
    borderUpColor: '#00c087',
    borderDownColor: '#e74c3c',
    wickUpColor: '#00c087',
    wickDownColor: '#e74c3c',
  });

  if (data && data.length) {
    candleSeries.setData(data);
    chart.timeScale().fitContent();
  }

  // Resize observer
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  ro.observe(container);

  return { chart, candleSeries, ro };
}

export function formatKlineData(klines) {
  if (!klines || !klines.length) return [];
  return klines.map(k => {
    if (Array.isArray(k)) {
      return {
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      };
    }
    return {
      time: Math.floor((k.openTime || k.time || k.t) / 1000),
      open: parseFloat(k.open || k.o),
      high: parseFloat(k.high || k.h),
      low: parseFloat(k.low || k.l),
      close: parseFloat(k.close || k.c),
    };
  }).filter(k => k.time && !isNaN(k.open));
}

window.mefaiChart = { createChart, formatKlineData };
export default { createChart, formatKlineData };
