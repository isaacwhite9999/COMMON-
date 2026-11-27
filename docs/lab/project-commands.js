/* Project command templates are stored privately and can only fill editable fields. */
(() => {
  'use strict';
  const PAGE_SIZE = 8;

  function mount(root, { client, project, owner, active, apply }) {
    root.innerHTML = `
      <details>
        <summary>Reusable project commands</summary>
        <p>Save a goal and evidence template. Applying a command fills the assistant form for your review.</p>
        <form class="lab-form">
          <label class="lab-label">Command name
            <input class="lab-input" name="commandName" minlength="3" maxlength="80" required>
          </label>
          <label class="lab-label">Command goal
            <input class="lab-input" name="commandGoal" minlength="10" maxlength="500" required>
          </label>
          <label class="lab-label">Command evidence
            <textarea class="lab-input" name="commandEvidence" minlength="20" maxlength="6000" rows="3" required></textarea>
          </label>
          <div class="lab-row">
            <button class="lab-button" type="submit">Save command</button>
            <button class="lab-button secondary" type="button" data-cancel hidden>Cancel edit</button>
          </div>
        </form>
        <p role="status"></p>
        <p class="lab-alert error" role="alert" hidden></p>
        <div class="lab-item-list" data-commands></div>
        <button class="lab-button secondary" type="button" data-more hidden>Load older commands</button>
        <button class="lab-button secondary" type="button" data-retry hidden>Reload commands</button>
      </details>`;
    const get = selector => root.querySelector(selector);
    const details = get('details');
    const form = get('form');
    const list = get('[data-commands]');
    const status = get('[role=status]');
    const error = get('[role=alert]');
    const more = get('[data-more]');
    const retry = get('[data-retry]');
    const save = get('button[type=submit]');
    const cancel = get('[data-cancel]');
    let editing = null;
    let cursor = null;
    let loaded = false;
    let busy = false;

    function message(text, failed = false) {
      if (!active()) return;
      error.hidden = !failed;
      error.textContent = failed ? text : '';
      status.textContent = failed ? '' : text;
    }

    function setBusy(value) {
      busy = value;
      for (const control of root.querySelectorAll('button, input, textarea')) control.disabled = value;
    }

    function resetForm() {
      form.reset();
      editing = null;
      save.textContent = 'Save command';
      cancel.hidden = true;
    }

    const scoped = query => query.eq('workspace_id', project.id).eq('owner_id', owner);

    function renderCommand(command) {
      const item = document.createElement('details');
      const title = document.createElement('summary');
      title.textContent = command.name;
      const goal = document.createElement('p');
      goal.textContent = command.goal;
      const evidence = document.createElement('pre');
      evidence.textContent = command.evidence;
      const actions = document.createElement('div');
      actions.className = 'lab-row';
      const button = (label, onClick) => {
        const control = document.createElement('button');
        control.type = 'button';
        control.className = 'lab-button secondary';
        control.textContent = label;
        control.addEventListener('click', onClick);
        actions.append(control);
      };
      if (apply) button('Apply command', () => {
        if (active() && !busy) apply(command);
      });
      button('Edit command', () => {
        if (!active() || busy) return;
        editing = command.id;
        form.elements.commandName.value = command.name;
        form.elements.commandGoal.value = command.goal;
        form.elements.commandEvidence.value = command.evidence;
        save.textContent = 'Update command';
        cancel.hidden = false;
        form.elements.commandName.focus();
      });
      button('Delete command', async () => {
        if (!active() || busy || !confirm('Delete this reusable command?')) return;
        setBusy(true);
        try {
          const { data, error: failure } = await scoped(client.from('research_assistant_commands').delete())
            .eq('id', command.id).select('id');
          if (failure || data?.length !== 1) throw Error('Delete failed');
          if (editing === command.id) resetForm();
          await load(true, 'Command deleted.');
        } catch {
          message('Could not delete the command. Try again.', true);
        } finally {
          setBusy(false);
        }
      });
      item.append(title, goal, evidence, actions);
      return item;
    }

    async function load(reset = false, notice = '') {
      if (!active()) return;
      retry.hidden = true;
      message('Loading project commands…');
      let query = scoped(client.from('research_assistant_commands').select('id,name,goal,evidence,created_at'))
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE + 1);
      if (!reset && cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      try {
        const { data, error: failure } = await query;
        if (!active()) return;
        if (failure) throw failure;
        const page = data.slice(0, PAGE_SIZE);
        if (reset) list.replaceChildren();
        for (const command of page) list.append(renderCommand(command));
        cursor = page.at(-1);
        more.hidden = data.length <= PAGE_SIZE;
        loaded = true;
        message(notice || (list.childElementCount ? '' : 'No reusable project commands yet.'));
      } catch {
        message('Could not load project commands.', true);
        retry.hidden = false;
      }
    }

    async function reload(reset) {
      if (busy) return;
      setBusy(true);
      try { await load(reset); }
      finally { setBusy(false); }
    }

    details.addEventListener('toggle', () => {
      if (details.open && !loaded) void reload(true);
    });
    more.addEventListener('click', () => { void reload(false); });
    retry.addEventListener('click', () => { void reload(true); });
    cancel.addEventListener('click', () => { resetForm(); form.elements.commandName.focus(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!active() || busy) return;
      const fields = {
        name: form.elements.commandName.value.trim(),
        goal: form.elements.commandGoal.value.trim(),
        evidence: form.elements.commandEvidence.value.trim()
      };
      if (fields.name.length < 3 || fields.goal.length < 10 || fields.evidence.length < 20) {
        message('Enter a command name, goal and evidence using the minimum lengths.', true);
        return;
      }
      setBusy(true);
      try {
        const table = client.from('research_assistant_commands');
        const query = editing ? scoped(table.update(fields)).eq('id', editing) :
          table.insert({ ...fields, workspace_id: project.id, owner_id: owner });
        const { data, error: failure } = await query.select('id');
        if (failure) throw failure;
        if (data?.length !== 1) throw Error('Save failed');
        if (!active()) return;
        const notice = editing ? 'Command updated.' : 'Command saved.';
        resetForm();
        await load(true, notice);
      } catch (failure) {
        message(failure?.code === '23505' ? 'A command with that name already exists.' : 'Could not save the command. Try again.', true);
      } finally {
        setBusy(false);
      }
    });
  }

  window.CommonProjectCommands = Object.freeze({ mount });
})();
