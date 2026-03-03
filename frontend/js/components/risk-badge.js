// MEFAI Risk Badge — Token audit risk display

export function renderRiskBadge(level) {
  if (level === null || level === undefined) return '<span class="risk-badge risk-low">—</span>';
  // Handle numeric levels (0=safe, 1=medium, 2+=high) and string levels
  const s = String(level);
  const n = Number(level);
  let cls = 'risk-low';
  let label = 'SAFE';
  if (!isNaN(n)) {
    if (n === 0) { cls = 'risk-low'; label = 'SAFE'; }
    else if (n === 1) { cls = 'risk-medium'; label = 'MEDIUM'; }
    else { cls = 'risk-high'; label = 'HIGH'; }
  } else {
    const l = s.toLowerCase();
    if (l === 'high' || l === 'danger') { cls = 'risk-high'; label = 'HIGH'; }
    else if (l === 'medium' || l === 'med') { cls = 'risk-medium'; label = 'MEDIUM'; }
    else if (l === 'low' || l === 'safe') { cls = 'risk-low'; label = 'SAFE'; }
    else { label = s.toUpperCase(); }
  }
  return `<span class="risk-badge ${cls}">${label}</span>`;
}

window.mefaiRiskBadge = renderRiskBadge;
export default renderRiskBadge;
