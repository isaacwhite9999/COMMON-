/* Durable, member-approved planning runs. This panel never executes code or tools. */
(() => {
  'use strict';
  const PAGE_SIZE = 8;
  const COLUMNS = 'id,goal,evidence,state,version,attempts,lease_expires_at,draft,result_status,created_at';
  const labels = {
    awaiting_approval: 'Awaiting approval', running: 'Running', succeeded: 'Succeeded',
    failed: 'Failed', cancelled: 'Cancelled'
  };

  function mount(root, { client, project, owner, active, enabled }) {
    root.innerHTML = `
      <details>
        <summary>Planning runs and approvals</summary>
        <p>Save a fixed goal and evidence, then review and approve a bounded model request. Cancellation blocks a saved result; a model request already sent may still finish.</p>
        <p data-disabled hidden>The provider is disabled. You can prepare and review runs without sharing data.</p>
        <form class="lab-form">
          <label class="lab-label">Run goal
            <input class="lab-input" name="goal" minlength="10" maxlength="500" required>
          </label>
          <label class="lab-label">Run evidence
            <textarea class="lab-input" name="evidence" rows="3" minlength="20" maxlength="9000" required></textarea>
          </label>
          <button class="lab-button" type="submit">Prepare run</button>
        </form>
        <p role="status"></p>
        <p class="lab-alert error" role="alert" hidden></p>
        <div class="lab-row">
          <button class="lab-button secondary" data-refresh type="button">Refresh runs</button>
          <button class="lab-button secondary" data-more type="button" hidden>Load older runs</button>
        </div>
        <div class="lab-item-list" data-list></div>
      </details>`;
    const get = selector => root.querySelector(selector);
    const form = get('form');
    const list = get('[data-list]');
    const status = get('[role=status]');
    const failure = get('[role=alert]');
    const more = get('[data-more]');
    const approvals = new Set();
    let loaded = false;
    let loadSequence = 0;
    let cursor = null;
    get('[data-disabled]').hidden = enabled;

    function message(text, isError = false) {
      if (!active()) return;
      status.textContent = isError ? '' : text;
      failure.textContent = isError ? text : '';
      failure.hidden = !isError;
    }
    const scoped = query => query.eq('workspace_id', project.id).eq('owner_id', owner);
    function button(label, action) {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'lab-button secondary';
      control.textContent = label;
      control.addEventListener('click', action);
      return control;
    }
    const para = text => {
      const node = document.createElement('p');
      node.textContent = text;
      return node;
    };
    const block = text => {
      const node = document.createElement('pre');
      node.textContent = text;
      return node;
    };

    function renderRun(row, openIds) {
      const details = document.createElement('details');
      details.dataset.run = row.id;
      details.open = openIds.has(row.id);
      const summary = document.createElement('summary');
      const expired = row.state === 'running' && Date.parse(row.lease_expires_at) <= Date.now();
      summary.textContent = row.goal + ' · ' + (expired ? 'Attempt expired' : labels[row.state]);
      details.append(summary, para(`Version ${row.version} · ${row.attempts} of 2 attempts`), para('Captured evidence'), block(row.evidence));
      if (row.draft) details.append(para(`Unverified research draft · ${row.result_status}`), block(row.draft));

      if (enabled && row.attempts < 2 && (row.state === 'awaiting_approval' || row.state === 'failed' || expired)) {
        const consent = document.createElement('input');
        consent.type = 'checkbox';
        const label = document.createElement('label');
        label.append(consent, ' Approve sending this fixed goal and evidence to the configured model.');
        const approve = button(row.attempts ? 'Approve retry' : 'Approve and run', async () => {
          if (!active() || !consent.checked || approvals.has(row.id)) return;
          approvals.add(row.id);
          consent.checked = false;
          consent.disabled = true;
          approve.disabled = true;
          message('Starting the approved planning request…');
          let succeeded = false;
          try {
            const { error } = await client.functions.invoke('common-research-agent', {
              body: { run_id: row.id, run_version: row.version, consent: true }
            });
            succeeded = !error;
          } catch {
            // A dropped request may have reached the service. Read durable state below.
          } finally {
            approvals.delete(row.id);
            consent.disabled = false;
          }
          await load(true, succeeded ? 'Planning request completed. Review the saved result.' : '');
          if (!succeeded) message('The request did not complete. Review the saved run state before retrying.', true);
        });
        consent.disabled = approvals.has(row.id);
        approve.disabled = true;
        consent.addEventListener('change', () => { approve.disabled = !consent.checked || approvals.has(row.id); });
        details.append(label, approve);
      }

      if (['awaiting_approval', 'running', 'failed'].includes(row.state)) {
        details.append(button('Cancel run', async event => {
          if (!active() || !confirm('Cancel this planning run? A provider request already sent may still finish.')) return;
          const control = event.currentTarget;
          control.disabled = true;
          try {
            const { data, error } = await client.rpc('cancel_research_assistant_run', { p_id: row.id, p_version: row.version });
            if (error || data !== true) throw Error('Current run state changed');
            await load(true, 'Planning run cancelled.');
          } catch {
            await load(true);
            message('Could not cancel this version. Review the current run and try again.', true);
          } finally {
            control.disabled = false;
          }
        }));
      }
      if (['succeeded', 'failed', 'cancelled'].includes(row.state)) {
        details.append(button('Delete run', async event => {
          if (!active() || !confirm('Delete this saved planning run?')) return;
          const control = event.currentTarget;
          control.disabled = true;
          try {
            const { data, error } = await scoped(client.from('research_assistant_runs').delete()).eq('id', row.id).select('id');
            if (error || data?.length !== 1) throw Error('Delete failed');
            await load(true, 'Planning run deleted.');
          } catch {
            message('Could not delete the run. Refresh and try again.', true);
          } finally {
            control.disabled = false;
          }
        }));
      }
      return details;
    }

    async function load(reset = false, notice = '') {
      if (!active()) return;
      const sequence = ++loadSequence;
      more.disabled = true;
      let query = scoped(client.from('research_assistant_runs').select(COLUMNS))
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE + 1);
      if (!reset && cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      try {
        const { data, error } = await query;
        if (!active() || sequence !== loadSequence) return;
        if (error) throw error;
        const rows = data.slice(0, PAGE_SIZE);
        const openIds = new Set(Array.from(list.querySelectorAll('details[open]'), detail => detail.dataset.run));
        if (reset) list.replaceChildren();
        for (const row of rows) list.append(renderRun(row, openIds));
        cursor = rows.at(-1);
        more.hidden = data.length <= PAGE_SIZE;
        loaded = true;
        message(notice || (list.childElementCount ? '' : 'No planning runs yet.'));
      } catch {
        if (sequence === loadSequence) message('Could not load saved planning runs. Refresh and try again.', true);
      } finally {
        if (sequence === loadSequence) more.disabled = false;
      }
    }

    get('details').addEventListener('toggle', event => {
      if (event.target.open && !loaded) void load(true);
    });
    get('[data-refresh]').addEventListener('click', () => { void load(true); });
    more.addEventListener('click', () => { void load(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button');
      if (!active() || submit.disabled) return;
      const goal = form.elements.goal.value.trim();
      const evidence = form.elements.evidence.value.trim();
      if (goal.length < 10 || evidence.length < 20) {
        message('Enter a goal of at least 10 characters and evidence of at least 20 characters.', true);
        return;
      }
      submit.disabled = true;
      try {
        const { error } = await client.from('research_assistant_runs').insert({ workspace_id: project.id, owner_id: owner, goal, evidence });
        if (error) throw error;
        if (!active()) return;
        form.reset();
        await load(true, 'Run prepared. Review the fixed evidence before approving.');
      } catch {
        message('Could not prepare this run. Your input is still available.', true);
      } finally {
        submit.disabled = false;
      }
    });
  }

  window.CommonProjectRuns = Object.freeze({ mount });
})();
