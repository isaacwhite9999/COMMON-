(() => {
  'use strict';

  function inspectEquity(root, run, chart) {
    const control = root.querySelector('#equity-observation');
    if (!control) return;
    const output = root.querySelector('#equity-values');
    const cursor = root.querySelector('[data-equity-cursor]');
    const last = Number(control.max);
    const display = index => {
      const x = 24 + index * (chart.width - 48) / last;
      cursor.setAttribute('x1', x);
      cursor.setAttribute('x2', x);
      const format = value => Number.isFinite(value) ? value.toFixed(3) : 'Unavailable';
      output.textContent = 'Observation ' + (index + 1) + ' of ' + (last + 1) +
        ' · Strategy ' + format(run.test.curve[index]) +
        ' · Buy & hold ' + format(run.baseline.curve[index]);
    };
    control.addEventListener('input', () => display(Number(control.value)));
    display(Number(control.value));
  }

  function configureComparison(root) {
    const table = root.querySelector('[data-report-comparison] table');
    if (!table) return;
    const headings = Array.from(table.tHead.rows[0].cells);
    const rows = Array.from(table.tBodies[0].rows);
    const menu = root.querySelector('.comparison-columns');
    const key = 'common.report.columns.v1';
    let hidden = [];
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved)) hidden = [...new Set(saved.filter(i => Number.isInteger(i) && i > 0 && i < headings.length))].slice(0, headings.length - 2);
    } catch {
      // Defaults stay available if preferences cannot be read.
    }

    function setColumn(index, visible) {
      headings[index].hidden = !visible;
      for (const row of rows) row.cells[index].hidden = !visible;
    }

    let sorting = -1;
    let ascending = true;
    for (const [index, heading] of headings.entries()) {
      const label = heading.textContent;
      const sort = document.createElement('button');
      sort.type = 'button';
      sort.textContent = label;
      sort.setAttribute('aria-label', 'Sort by ' + label);
      heading.replaceChildren(sort);
      sort.addEventListener('click', () => {
        ascending = sorting !== index || !ascending;
        if (sorting >= 0) headings[sorting].removeAttribute('aria-sort');
        sorting = index;
        heading.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
        const displayValue = row => row.cells[index].textContent.trim();
        rows.sort((a, b) => {
          const left = displayValue(a), right = displayValue(b);
          if (index > 0) {
            const x = Number.parseFloat(left), y = Number.parseFloat(right);
            if (!Number.isFinite(x)) return Number.isFinite(y) ? 1 : 0;
            if (!Number.isFinite(y)) return -1;
            return (x - y) * (ascending ? 1 : -1);
          }
          return left.localeCompare(right) * (ascending ? 1 : -1);
        });
        table.tBodies[0].append(...rows);
      });
      if (index === 0) continue;
      const entry = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !hidden.includes(index);
      entry.append(checkbox, label);
      menu.append(entry);
      setColumn(index, checkbox.checked);
      checkbox.addEventListener('change', () => {
        if (!checkbox.checked && hidden.length === headings.length - 2) {
          checkbox.checked = true;
          menu.querySelector('[role=status]').textContent = 'Keep at least one data column visible.';
          return;
        }
        hidden = checkbox.checked ? hidden.filter(i => i !== index) : [...hidden, index];
        menu.querySelector('[role=status]').textContent = '';
        setColumn(index, checkbox.checked);
        try {
          localStorage.setItem(key, JSON.stringify(hidden));
        } catch {
          menu.querySelector('[role=status]').textContent = 'Column changes apply to this report view.';
        }
      });
    }
  }

  window.CommonReportControls = { inspectEquity, configureComparison };
})();
