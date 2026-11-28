(() => {
  'use strict';

  /** @typedef {{id: string, path: string, label: string, keywords: string}} Destination */
  /** @type {Destination[]} */
  const destinations = [
    { id: 'terminal', path: 'terminal/', label: 'Markets', keywords: 'watchlist terminal data' },
    { id: 'workspace', path: 'workspace/#research', label: 'Research', keywords: 'local projects backtest datasets notebooks' },
    { id: 'lab', path: 'lab/', label: 'Research Studio', keywords: 'member projects experiments lessons' },
    { id: 'live', path: 'live/', label: 'Community', keywords: 'feed circles messages profile account sign in' },
    { id: 'appearance', path: 'settings/appearance/', label: 'Appearance', keywords: 'settings density display' },
    { id: 'privacy', path: 'live/?settings=privacy', label: 'Privacy', keywords: 'account settings messaging audience connections blocks' }
  ];
  const base = new URL('../', document.currentScript.src);
  const densityKey = 'common.appearance.density.v1';
  const researchRouteKey = 'common.routes.research.v1';
  const researchFragment = /^#[a-z0-9-]+(?:\/[a-z0-9._-]+){0,4}$/i;
  const layout = document.querySelector('[data-common-shell]');

  function persistedDensity() {
    try {
      return localStorage.getItem(densityKey) === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  }

  // Restore the local research route within this tab. Auth callback and invite
  // fragments are never collected by the shell.
  function rememberResearchRoute() {
    try {
      if (researchFragment.test(location.hash)) {
        sessionStorage.setItem(researchRouteKey, location.hash);
      }
    } catch {
      // Navigation remains available when browser storage is blocked.
    }
  }

  if (layout.dataset.commonShell === 'workspace') {
    rememberResearchRoute();
    window.addEventListener('hashchange', rememberResearchRoute);
  }

  function link(label, path) {
    const anchor = document.createElement('a');
    anchor.textContent = label;
    const url = new URL(path, base);
    if (path === 'workspace/#research' && layout.dataset.commonShell !== 'workspace') {
      try {
        const saved = sessionStorage.getItem(researchRouteKey);
        if (saved && researchFragment.test(saved)) url.hash = saved;
      } catch {
        // The default research route is always available.
      }
    }
    anchor.href = url;
    return anchor;
  }

  document.documentElement.dataset.commonDensity = persistedDensity();
  function preference(id, key, fallback, validate, apply) {
    let current = fallback;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null && validate(stored)) current = stored;
    } catch {
      // The interface still works without browser storage.
    }
    apply(current);
    const control = document.getElementById(id);
    if (!control) return;
    control.value = current;
    control.addEventListener('input', () => {
      if (validate(control.value)) apply(control.value);
    });
    control.addEventListener('change', () => {
      const status = document.getElementById('common-preference-status');
      if (!validate(control.value)) return;
      try {
        localStorage.setItem(key, control.value);
        if (status) status.textContent = 'Appearance saved on this browser.';
      } catch {
        if (status) status.textContent = 'Browser storage is unavailable. This change applies to this page.';
      }
    });
  }
  preference('common-density', densityKey, persistedDensity(), value => ['comfortable','compact'].includes(value),
    value => { document.documentElement.dataset.commonDensity = value; });
  preference('common-guidance', 'common.guidance.v1', 'essential',
    value => ['essential','advanced'].includes(value),
    value => { document.documentElement.dataset.commonGuidance = value; });
  preference('common-sidebar', 'common.sidebar.v1', '228',
    value => /^\d{3}$/.test(value) && Number(value) >= 184 && Number(value) <= 320,
    value => { document.documentElement.style.setProperty('--common-sidebar', value + 'px'); });

  const brand = link('COMMON', './');
  brand.className = 'common-brand';
  if (layout.dataset.commonShell === 'home') brand.setAttribute('aria-current', 'page');

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'COMMON departments');
  const departmentLinks = destinations.map(destination => link(destination.label, destination.path));
  nav.append(...departmentLinks);
  function markCurrentDepartment() {
    const active = layout.dataset.commonShell === 'live' &&
      new URLSearchParams(location.search).get('settings') === 'privacy' ? 'privacy' : layout.dataset.commonShell;
    departmentLinks.forEach((anchor,index)=>{
      if (destinations[index].id === active) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
  }
  markCurrentDepartment();
  window.addEventListener('common:route-change',markCurrentDepartment);

  const open = document.createElement('button');
  open.type = 'button';
  open.innerHTML = 'Find a tool <kbd aria-hidden="true">Alt K</kbd>';
  open.setAttribute('aria-keyshortcuts', 'Alt+K');
  open.setAttribute('aria-label', 'Find a tool');
  const dialog = document.createElement('dialog');
  dialog.className = 'common-search';
  dialog.setAttribute('aria-labelledby', 'common-search-title');
  dialog.innerHTML = `
    <form method="dialog"><button type="submit">Close</button></form>
    <h2 id="common-search-title">Find a tool</h2>
    <label for="common-search-input">Search destinations</label>
    <input id="common-search-input" type="search" autofocus>
    <ul></ul>
    <p role="status" hidden>No matching destinations.</p>`;
  const input = dialog.querySelector('input');
  const results = dialog.querySelector('ul');
  const empty = dialog.querySelector('[role="status"]');

  function filter() {
    const query = input.value.trim().toLowerCase().split(/\s+/);
    const matching = destinations.filter(({ label, keywords }) =>
      query.every(term => `${label} ${keywords}`.toLowerCase().includes(term)));
    results.replaceChildren(...matching.map(({ label, path }) => {
      const item = document.createElement('li');
      const anchor = link(label, path);
      anchor.addEventListener('click', () => dialog.close());
      item.append(anchor);
      return item;
    }));
    empty.hidden = matching.length > 0;
  }

  open.addEventListener('click', () => {
    input.value = '';
    filter();
    dialog.showModal();
  });
  document.addEventListener('keydown', event => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyK' &&
        !document.querySelector('dialog[open], [aria-modal="true"]:not([aria-hidden="true"] *)') &&
        !event.defaultPrevented) {
      event.preventDefault();
      open.click();
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = Array.from(results.querySelectorAll('a'));
    if (!links.length) return;
    const index = links.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? links.length - 1 : index - 1;
    event.preventDefault();
    if (next < 0) input.focus();
    else links[next % links.length].focus();
  });
  input.addEventListener('input', filter);
  dialog.addEventListener('close', () => open.focus());

  layout.append(brand, nav, open);
  document.body.append(dialog);
})();
