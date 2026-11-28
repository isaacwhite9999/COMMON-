/* The account library shares member auth and stores only reviewed specs and source hashes. */
(() => {
  'use strict';

  function mount({ activeSnapshot, openRevision, clearAccountView }) {
    let client;
    const get = id => document.getElementById(id);
    const list = get('account-documents');
    const status = get('account-status');
    const controls = get('account-controls');
    const consent = get('account-consent');
    let owner, activeDocument, epoch = 0, request = 0, busy = false;

    function report(message) { status.textContent = message; }
    function syncControls() {
      controls.disabled = busy || !owner;
      get('account-update').disabled = !activeDocument;
    }
    function button(text, handler) {
      const element = window.document.createElement('button');
      element.type = 'button';
      element.textContent = text;
      element.onclick = handler;
      return element;
    }
    function announce(error) {
      if (error?.code === '40001') return 'The account copy changed, or it is unavailable. Refresh before retrying.';
      if (error?.code === '54000') return 'The account holds up to 30 Canvas documents. Remove a document before creating another.';
      return error?.local ? error.message : 'The Canvas account library is unavailable. Device copies are unaffected. Try again.';
    }
    function localError(message) { return Object.assign(Error(message), { local: true }); }
    async function perform(task) {
      if (busy || !owner) return;
      const expectedEpoch = epoch;
      const current = () => expectedEpoch === epoch;
      busy = true;
      syncControls();
      try { await task(current); }
      catch (error) { if (current()) report(announce(error)); }
      finally {
        if (current()) {
          busy = false;
          syncControls();
        }
      }
    }
    function open(entry) {
      if (busy) return;
      void perform(async current => {
        const { data, error } = await client.from('canvas_revisions')
          .select('revision,spec,source_digest,created_at').eq('document_id', entry.id)
          .order('revision', { ascending: false }).limit(10);
        if (!current()) return;
        if (error) throw error;
        list.replaceChildren();
        activeDocument = entry;
        list.append(button('Back to account documents', () => void perform(refresh)));
        const ordered = window.document.createElement('ol');
        for (const revision of data) {
          const item = window.document.createElement('li');
          item.append(button('Open account revision ' + revision.revision, () => void perform(async isCurrent => {
            try {
              await openRevision(revision, isCurrent);
              if (isCurrent()) report('Opened an account revision. The original CSV stayed on this device.');
            } catch (error) {
              throw localError(error.message);
            }
          })));
          item.append(' · ' + new Date(revision.created_at).toLocaleString());
          ordered.append(item);
        }
        list.append(ordered);
        report('Viewing revisions for ' + entry.title + '. A new revision updates the selected document.');
      });
    }

    async function refresh(current) {
      const read = ++request;
      const { data, error } = await client.from('canvas_documents')
        .select('id,title,revision,updated_at').eq('owner_id', owner)
        .order('updated_at', { ascending: false }).order('id', { ascending: false }).limit(30);
      if (!current() || read !== request) return;
      if (error) throw error;
      activeDocument = null;
      list.replaceChildren();
      if (!data.length) list.append('No account documents saved.');
      for (const entry of data) {
        const item = window.document.createElement('div');
        const heading = window.document.createElement('strong');
        heading.textContent = entry.title;
        const remove = button('Delete account document', () => {
          if (busy || !confirm('Delete this account document and its revisions?')) return;
          void perform(async isCurrent => {
            const { data, error } = await client.rpc('delete_canvas_document_v1', {
              target: entry.id, expected: entry.revision
            });
            if (!isCurrent()) return;
            if (error) throw error;
            if (!data) throw Object.assign(Error(), { code: '40001' });
            await refresh(isCurrent);
            if (isCurrent()) report('Account document deleted.');
          });
        });
        item.append(heading, button('View account revisions', () => open(entry)), remove);
        list.append(item);
      }
      report('Private account library. Source files stay on the device.');
    }

    function save(newDocument) {
      void perform(async current => {
        if (!consent.checked) throw localError('Confirm that the specification and source fingerprint may be sent to your account.');
        const snapshot = activeSnapshot();
        if (!snapshot) throw localError('Render a chart before saving it to your account.');
        if (!newDocument && !activeDocument) throw localError('Open an account document to append a revision.');
        const { error } = await client.rpc('save_canvas_document_v1', {
          target: newDocument ? null : activeDocument.id,
          expected: newDocument ? 0 : activeDocument.revision,
          digest: snapshot.digest,
          payload: snapshot.spec
        });
        if (!current()) return;
        if (error) throw error;
        consent.checked = false;
        await refresh(current);
        if (current()) report('Account revision saved. No source rows were sent.');
      });
    }

    function setSession(session) {
      const id = session?.user?.id || null;
      if (owner === id) return;
      if (owner) clearAccountView();
      owner = id;
      epoch++;
      busy = false;
      activeDocument = null;
      list.replaceChildren();
      consent.checked = false;
      syncControls();
      if (!owner) {
        report('Sign in through Community to open your private Canvas library.');
        return;
      }
      report('Loading your private Canvas library…');
      const signedIn = epoch;
      setTimeout(() => { if (signedIn === epoch) void perform(refresh); }, 0);
    }
    async function connect() {
      const config = window.COMMON_CONFIG;
      if (config?.communityBackendReady !== true || !config.supabaseUrl || !config.supabaseAnonKey) {
        report('Account storage is unavailable in this preview. Device storage remains available.');
        return;
      }
      if (!window.supabase?.createClient) await new Promise((resolve, reject) => {
        const script = window.document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.min.js';
        script.onload = resolve;
        script.onerror = reject;
        window.document.head.append(script);
      });
      client = window.CommonSession?.memberClient();
      if (!client) throw Error('Member client unavailable');
      client.auth.onAuthStateChange((_event, session) => setSession(session));
      const initialEpoch = epoch;
      const { data, error } = await client.auth.getSession();
      if (epoch !== initialEpoch) return;
      if (error) throw error;
      setSession(data.session);
    }
    void connect().catch(() => report('Account sign-in could not be read. Device storage remains available.'));
    get('account-refresh').onclick = () => void perform(refresh);
    get('account-create').onclick = () => save(true);
    get('account-update').onclick = () => save(false);
  }

  window.CommonCanvasAccount = Object.freeze({ mount });
})();
