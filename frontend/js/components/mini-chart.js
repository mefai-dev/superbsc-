// MEFAI Mini Chart — SVG sparkline component

export function renderSparkline(values, width = 60, height = 16) {
  if (!values || !values.length) return '';
  const nums = values.map(Number).filter(n => !isNaN(n));
  if (!nums.length) return '';

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const step = width / (nums.length - 1 || 1);

  const points = nums.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const up = nums[nums.length - 1] >= nums[0];
  const color = up ? 'var(--up)' : 'var(--down)';

  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1"/>
  </svg>`;
}

window.mefaiSparkline = renderSparkline;
export default renderSparkline;
