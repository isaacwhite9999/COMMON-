(() => {
  'use strict';

  /** @typedef {{id: string, path: string, label: string, keywords: string}} Destination */
  /** @type {Destination[]} */
  const destinations = [
    { id: 'terminal', path: 'terminal/', label: 'Markets', keywords: 'watchlist terminal data' },
    { id: 'workspace', path: 'workspace/#research', label: 'Research', keywords: 'local projects backtest datasets notebooks' },
    { id: 'lab', path: 'lab/', label: 'Research Studio', keywords: 'member projects experiments lessons' },
    { id: 'live', path: 'live/', label: 'Community', keywords: 'feed circles messages profile account sign in' },
    { id: 'appearance', path: 'settings/appearance/', label: 'Appearance', keywords: 'settings density display' }
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
  const preference = document.querySelector('#common-density');
  if (preference) {
    preference.value = persistedDensity();
    preference.addEventListener('change', () => {
      const status = document.querySelector('#common-preference-status');
      document.documentElement.dataset.commonDensity = preference.value;
      try {
        localStorage.setItem(densityKey, preference.value);
        status.textContent = 'Appearance saved on this browser.';
      } catch {
        status.textContent = 'Browser storage is unavailable. This change applies to this page.';
      }
    });
  }

  const brand = link('COMMON', './');
  brand.className = 'common-brand';
  if (layout.dataset.commonShell === 'home') brand.setAttribute('aria-current', 'page');

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'COMMON departments');
  for (const destination of destinations) {
    const anchor = link(destination.label, destination.path);
    if (layout.dataset.commonShell === destination.id) anchor.setAttribute('aria-current', 'location');
    nav.append(anchor);
  }

  const open = document.createElement('button');
  open.type = 'button';
  open.textContent = 'Find a tool';
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
  input.addEventListener('input', filter);
  dialog.addEventListener('close', () => open.focus());

  layout.append(brand, nav, open);
  document.body.append(dialog);
})();
