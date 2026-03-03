// MEFAI Data Table — Sortable, filterable table component

export function renderTable(columns, rows, options = {}) {
  const { sortKey, sortDir = 'desc', onSort, onRowClick, id = '' } = options;

  const ths = columns.map(col => {
    const sorted = sortKey === col.key;
    const cls = sorted ? `sorted ${sortDir === 'asc' ? 'asc' : ''}` : '';
    return `<th data-key="${col.key}" class="${cls}" style="${col.width ? `width:${col.width}` : ''}">${col.label}</th>`;
  }).join('');

  const trs = rows.map((row, i) => {
    const tds = columns.map(col => {
      const val = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—');
      const align = col.align === 'right' ? 'text-align:right' : '';
      return `<td style="${align}" data-key="${col.key}">${val}</td>`;
    }).join('');
    return `<tr data-index="${i}">${tds}</tr>`;
  }).join('');

  return `<table class="data-table" ${id ? `id="${id}"` : ''}>
    <thead><tr>${ths}</tr></thead>
    <tbody>${trs}</tbody>
  </table>`;
}

export function bindTableEvents(container, columns, rows, options = {}) {
  const { onSort, onRowClick } = options;
  const table = container.querySelector('.data-table');
  if (!table) return;

  if (onSort) {
    table.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => onSort(th.dataset.key));
    });
  }

  if (onRowClick) {
    table.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = parseInt(tr.dataset.index);
        if (rows[idx]) onRowClick(rows[idx]);
      });
    });
  }
}

export function sortRows(rows, key, dir = 'desc') {
  return [...rows].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    const na = Number(va), nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

window.mefaiTable = { renderTable, bindTableEvents, sortRows };
export default { renderTable, bindTableEvents, sortRows };
