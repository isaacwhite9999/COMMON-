/* Private project history uses the member's existing Supabase session and the gated model endpoint. */
(() => {
  'use strict';
  const PAGE_SIZE = 10;
  const MAX_STEPS = 5;
  const PREVIOUS_CONTEXT_LIMIT = 3000;
  const columns = 'id,goal,evidence,draft,result_status,created_at,parent_draft_id,step_number';

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
        <section class="lab-card" data-previous hidden>
          <h3 data-continuation-title></h3>
          <p>Only the preview below is included from the selected turn.</p>
          <pre data-context></pre>
          <label><input type="checkbox" name="previousConsent">
            Include this previous response excerpt in the request.
          </label>
          <button class="lab-button secondary" type="button" data-clear-previous>Start a new plan instead</button>
        </section>
        <label><input type="checkbox" name="consent" required>
          Send this goal and evidence to the configured model provider. I have permission to share them.
        </label>
        <button class="lab-button" type="submit" data-submit>Draft research plan</button>
      </form>
      <p class="lab-hint" role="status" data-status></p>
      <p class="lab-alert error" role="alert" data-error hidden></p>
      <section class="lab-card" data-result hidden>
        <h3>Unverified research plan</h3>
        <p data-result-status></p>
        <pre data-draft></pre>
        <button class="lab-button" type="button" data-save>Save to this project</button>
      </section>
      <section class="lab-card" aria-label="Project commands" data-project-commands></section>
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
    let previous = null;

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
      for (const button of history.querySelectorAll('[data-resume]')) button.disabled = requestBusy;
    };

    function selectPrevious(row) {
      if (!active() || requestBusy) return;
      if (result && !confirm('Discard the unsaved response?')) return;
      previous = row;
      result = null;
      get('[data-result]').hidden = true;
      get('[data-draft]').textContent = '';
      get('[data-previous]').hidden = !row;
      get('[data-context]').textContent = row ?
        Array.from(row.draft).slice(0, PREVIOUS_CONTEXT_LIMIT).join('') : '';
      get('[data-continuation-title]').textContent = row ? 'Continue with turn ' + (row.step_number + 1) : '';
      get('[data-submit]').textContent = row ? 'Draft follow-up' : 'Draft research plan';
      form.elements.goal.readOnly = Boolean(row);
      form.elements.goal.value = row?.goal || '';
      form.elements.evidence.value = '';
      form.elements.evidence.maxLength = row ? 6000 : 9000;
      form.elements.previousConsent.checked = false;
      form.elements.previousConsent.required = Boolean(row);
      form.elements.consent.checked = false;
      status.textContent = row ? 'Review the previous response excerpt before sharing it.' : 'Starting a new research plan.';
      announceError('');
      form.elements.evidence.focus();
    }

    function recordElement(row) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = row.goal + ' · Turn ' + row.step_number + ' · ' + new Date(row.created_at).toLocaleDateString();
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
          if (failure?.code === '23503') {
            announceError('Delete the follow-up turns before deleting this draft.');
            return;
          }
          if (failure || data?.length !== 1) throw Error('Draft deletion failed');
          if (active()) await loadHistory(true);
        } catch {
          announceError('Could not delete this draft. Refresh the project history and try again.');
        } finally {
          remove.disabled = false;
        }
      });
      details.append(summary, label, evidenceHeading, evidence, draftHeading, draft);
      if (enabled && row.step_number < MAX_STEPS) {
        const resume = document.createElement('button');
        resume.className = 'lab-button';
        resume.type = 'button';
        resume.dataset.resume = '';
        resume.textContent = 'Continue from this draft';
        resume.disabled = requestBusy;
        resume.addEventListener('click', () => selectPrevious(row));
        details.append(resume, document.createTextNode(' '));
      } else if (enabled) {
        const limit = document.createElement('p');
        limit.textContent = 'This branch has reached its five-turn limit.';
        details.append(limit);
      }
      details.append(remove);
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
      if (!enabled || requestBusy || !active() || !form.elements.consent.checked ||
          (previous && !form.elements.previousConsent.checked)) return;
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
      form.elements.previousConsent.checked = false;
      const turn = previous;
      const step = turn ? turn.step_number + 1 : 1;
      try {
        const { data, error: failure } = await client.functions.invoke('common-research-agent', {
          body: {
            workspace_id: project.id, mode: 'plan', goal, input: evidence, consent: true,
            ...(turn ? { previous_draft_id: turn.id, previous_context_consent: true } : {})
          }
        });
        if (!active()) return;
        if (failure || typeof data?.text !== 'string' || !data.text.trim() ||
            !['complete', 'partial'].includes(data.status) ||
            (turn && data.step_number !== step)) throw Error('Research draft unavailable');
        result = {
          workspace_id: project.id, owner_id: owner, goal, evidence, draft: data.text, result_status: data.status,
          ...(turn ? { parent_draft_id: turn.id, step_number: step } : {})
        };
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

    get('[data-clear-previous]').addEventListener('click', () => selectPrevious(null));
    more.addEventListener('click', () => { announceError(''); void loadHistory(); });
    retry.addEventListener('click', () => { announceError(''); void loadHistory(true); });
    get('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    const close = () => { if (dialog.open) dialog.close(); };
    document.body.append(dialog);
    dialog.showModal();
    CommonProjectCommands.mount(get('[data-project-commands]'), {
      client, project, owner, active,
      apply: enabled ? command => {
        if (requestBusy) {
          announceError('Wait for the current research request before applying a command.');
          return;
        }
        if (result && !confirm('Discard the unsaved response?')) return;
        result = null;
        get('[data-result]').hidden = true;
        get('[data-draft]').textContent = '';
        if (!previous) form.elements.goal.value = command.goal;
        form.elements.evidence.value = command.evidence;
        form.elements.consent.checked = false;
        form.elements.previousConsent.checked = false;
        status.textContent = 'Command applied. Review the fields before sharing.';
        announceError('');
        form.elements.evidence.focus();
      } : null
    });
    void loadHistory(true);
    return close;
  }

  window.CommonProjectAssistant = Object.freeze({ mount });
})();
