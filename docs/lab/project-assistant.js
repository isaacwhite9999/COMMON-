/* Private project history uses the member's existing Supabase session and the gated model endpoint. */
(() => {
  'use strict';
  const PAGE_SIZE = 10;
  const columns = 'id,goal,evidence,draft,result_status,created_at';

  function mount(client, { project, owner, enabled, currentOwner }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'lab-card lab-assistant-dialog';
    dialog.setAttribute('aria-labelledby', 'project-assistant-title');
    dialog.innerHTML = `
      <div class="lab-split">
        <h2 id="project-assistant-title">Project research assistant</h2>
        <button class="lab-button secondary" type="button" data-close>Close</button>
      </div>
      <p data-project></p>
      <p>Request a research plan and review the draft before saving it. Project files and saved drafts are never included automatically.</p>
      <form class="lab-form">
        <label class="lab-label">Research goal
          <input class="lab-input" name="goal" minlength="10" maxlength="500" required>
        </label>
        <label class="lab-label">Evidence and constraints
          <textarea class="lab-input" name="evidence" minlength="20" maxlength="9000" rows="5" required></textarea>
        </label>
        <label><input type="checkbox" name="consent" required>
          Send this goal and evidence to the configured model provider. I have permission to share them.
        </label>
        <button class="lab-button" type="submit">Draft research plan</button>
      </form>
      <p class="lab-hint" role="status" data-status></p>
      <p class="lab-alert error" role="alert" data-error hidden></p>
      <section class="lab-card" data-result hidden>
        <h3>Unverified research plan</h3>
        <p data-result-status></p>
        <pre data-draft></pre>
        <button class="lab-button" type="button" data-save>Save to this project</button>
      </section>
      <section aria-label="Saved drafts">
        <h3>Saved project drafts</h3>
        <p data-empty hidden>No drafts saved in this project.</p>
        <div class="lab-item-list" data-history></div>
        <button class="lab-button secondary" type="button" data-more hidden>Load older drafts</button>
        <button class="lab-button secondary" type="button" data-retry hidden>Retry loading drafts</button>
      </section>`;
    const get = selector => dialog.querySelector(selector);
    const form = get('form');
    const status = get('[data-status]');
    const error = get('[data-error]');
    const history = get('[data-history]');
    const more = get('[data-more]');
    const retry = get('[data-retry]');
    const save = get('[data-save]');
    const formFields = Array.from(form.elements);
    const active = () => dialog.open && owner === currentOwner();
    let result = null;
    let cursor = null;
    let requestBusy = false;

    get('[data-project]').textContent = project.title;
    if (!enabled) {
      form.hidden = true;
      status.textContent = 'The model provider is disabled. Saved project drafts remain available.';
    }
    const announceError = message => {
      if (!active()) return;
      error.textContent = message;
      error.hidden = !message;
    };
    const refreshControls = () => {
      for (const field of formFields) field.disabled = requestBusy;
      save.disabled = requestBusy;
    };

    function recordElement(row) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = row.goal + ' · ' + new Date(row.created_at).toLocaleDateString();
      const label = document.createElement('p');
      label.textContent = (row.result_status === 'partial' ? 'Partial' : 'Complete') +
        ' response · member-saved, unverified research';
      const evidenceHeading = document.createElement('h4');
      evidenceHeading.textContent = 'Submitted evidence';
      const evidence = document.createElement('pre');
      evidence.textContent = row.evidence;
      const draftHeading = document.createElement('h4');
      draftHeading.textContent = 'Saved plan';
      const draft = document.createElement('pre');
      draft.textContent = row.draft;
      const remove = document.createElement('button');
      remove.className = 'lab-button secondary';
      remove.type = 'button';
      remove.textContent = 'Delete saved draft';
      remove.addEventListener('click', async () => {
        if (!active() || !confirm('Delete this saved research draft?')) return;
        remove.disabled = true;
        announceError('');
        try {
          const { data, error: failure } = await client.from('research_assistant_drafts')
            .delete().eq('id', row.id).eq('workspace_id', project.id).eq('owner_id', owner).select('id');
          if (failure || data?.length !== 1) throw Error('Draft deletion failed');
          if (active()) await loadHistory(true);
        } catch {
          announceError('Could not delete this draft. Refresh the project history and try again.');
        } finally {
          remove.disabled = false;
        }
      });
      details.append(summary, label, evidenceHeading, evidence, draftHeading, draft, remove);
      return details;
    }

    let historyLoad = 0;
    async function loadHistory(reset = false) {
      const load = ++historyLoad;
      more.disabled = true;
      retry.hidden = true;
      let query = client.from('research_assistant_drafts').select(columns)
        .eq('workspace_id', project.id).eq('owner_id', owner)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE + 1);
      if (!reset && cursor) {
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      }
      try {
        const { data, error: failure } = await query;
        if (!active() || load !== historyLoad) return;
        if (failure) throw failure;
        const page = data.slice(0, PAGE_SIZE);
        if (reset) history.replaceChildren();
        for (const row of page) history.append(recordElement(row));
        cursor = page.at(-1);
        more.hidden = data.length <= PAGE_SIZE;
        get('[data-empty]').hidden = history.childElementCount !== 0;
      } catch {
        if (load !== historyLoad || !active()) return;
        announceError('Could not load saved drafts.');
        retry.hidden = false;
      } finally {
        if (load === historyLoad) more.disabled = false;
      }
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!enabled || requestBusy || !active() || !form.elements.consent.checked) return;
      const goal = form.elements.goal.value.trim();
      const evidence = form.elements.evidence.value.trim();
      if (goal.length < 10 || evidence.length < 20) {
        announceError('Enter a goal of at least 10 characters and evidence of at least 20 characters.');
        return;
      }
      requestBusy = true;
      refreshControls();
      announceError('');
      result = null;
      get('[data-result]').hidden = true;
      status.textContent = 'Requesting a research draft…';
      form.elements.consent.checked = false;
      try {
        const { data, error: failure } = await client.functions.invoke('common-research-agent', {
          body: { workspace_id: project.id, mode: 'plan', goal, input: evidence, consent: true }
        });
        if (!active()) return;
        if (failure || typeof data?.text !== 'string' || !data.text.trim() ||
            !['complete', 'partial'].includes(data.status)) throw Error('Research draft unavailable');
        result = { workspace_id: project.id, owner_id: owner, goal, evidence, draft: data.text, result_status: data.status };
        get('[data-draft]').textContent = result.draft;
        get('[data-result-status]').textContent = (data.status === 'partial' ? 'Partial provider response. ' : '') +
          'Verify citations, calculations and assumptions independently.';
        get('[data-result]').hidden = false;
        status.textContent = 'Research draft returned. Review it before saving.';
      } catch {
        if (!active()) return;
        status.textContent = '';
        announceError('The assistant could not return a draft. Check your pilot access or try again later.');
      } finally {
        requestBusy = false;
        refreshControls();
      }
    });

    save.addEventListener('click', async () => {
      if (!active() || !result || requestBusy) return;
      requestBusy = true;
      refreshControls();
      announceError('');
      try {
        const { error: failure } = await client.from('research_assistant_drafts').insert(result);
        if (failure) throw failure;
        if (!active()) return;
        result = null;
        get('[data-result]').hidden = true;
        get('[data-draft]').textContent = '';
        status.textContent = 'Draft saved privately to this project.';
        await loadHistory(true);
      } catch {
        announceError('Could not save the draft. Your unsaved result is still available to retry.');
      } finally {
        requestBusy = false;
        refreshControls();
      }
    });

    more.addEventListener('click', () => { announceError(''); void loadHistory(); });
    retry.addEventListener('click', () => { announceError(''); void loadHistory(true); });
    get('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    const close = () => { if (dialog.open) dialog.close(); };
    document.body.append(dialog);
    dialog.showModal();
    void loadHistory(true);
    return close;
  }

  window.CommonProjectAssistant = Object.freeze({ mount });
})();
