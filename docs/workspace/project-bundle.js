(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./files.js') : root.CommonFiles);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CommonProjectBundle = api;
})(globalThis, function (files) {
  'use strict';

  const FORMAT = 'common-project-sources';
  const VERSION = 1;
  const MAX_BYTES = 2_000_000;
  const templates = Object.freeze({
    blank: '',
    strategy: 'Hypothesis\nWhich observable price pattern should improve holdout results after costs?\n\nInputs\nRecord the source fingerprint, benchmark, chronology and cost assumptions.\n\nEvaluation\nLock the training rules before observing holdout performance. Record a result that would overturn the hypothesis.',
    risk: 'Portfolio question\nWhat exposures or liquidity constraints matter for this allocation?\n\nInputs\nRecord target weights, dated sources and the benchmark.\n\nEvaluation\nCompare drawdown, concentration and historical tail risk. Document missing intervals and limitations.'
  });

  function string(value, max, field) {
    if (typeof value !== 'string' || value.length > max) throw Error('Invalid project ' + field + '.');
    return value;
  }

  function versioned(bundle) {
    if (!bundle || bundle.format !== FORMAT || bundle.version !== VERSION ||
        !Array.isArray(bundle.files) || bundle.files.length > 30) throw Error('Unsupported project source bundle.');
    const name = string(bundle.name, 120, 'name').trim();
    if (!name) throw Error('Project name is required.');
    const seen = new Set();
    const checkedFiles = bundle.files.map(file => {
      if (!file || !Array.isArray(file.revisions) || file.revisions.length > 4) throw Error('Invalid file history.');
      const path = files.path(string(file.path, 120, 'file path'));
      const key = path.toLowerCase();
      if (seen.has(key)) throw Error('The bundle contains duplicate file paths.');
      seen.add(key);
      return {
        path, content: string(file.content, 40000, 'file content'),
        revisions: file.revisions.map(revision => {
          if (!revision || typeof revision.at !== 'string' || !Number.isFinite(Date.parse(revision.at))) {
            throw Error('Invalid revision date.');
          }
          return { path: files.path(string(revision.path, 120, 'revision path')),
            content: string(revision.content, 40000, 'revision content'), at: new Date(revision.at).toISOString() };
        })
      };
    });
    return { format: FORMAT, version: VERSION, name, notes: string(bundle.notes, 10000, 'notes'), files: checkedFiles };
  }

  function serialize(project) {
    const contents = JSON.stringify(versioned({
      format: FORMAT, version: VERSION, name: project.name, notes: project.notes || '', files: files.list(project).map(file => ({ ...file, revisions: file.revisions || [] }))
    }), null, 2);
    if (new TextEncoder().encode(contents).length > MAX_BYTES) throw Error('Project source bundle exceeds 2 MB.');
    return contents;
  }

  function read(contents) {
    if (typeof contents !== 'string' || new TextEncoder().encode(contents).length > MAX_BYTES) {
      throw Error('Project source bundle exceeds 2 MB.');
    }
    let value;
    try {
      value = JSON.parse(contents);
    } catch {
      throw Error('Project source bundle must be valid JSON.');
    }
    return versioned(value);
  }

  function restore(bundle, makeProject) {
    const source = versioned(bundle);
    const project = makeProject(source.name);
    return { ...project, notes: source.notes, files: source.files.map(file => ({
      ...file, id: crypto.randomUUID(), updated: project.updated
    })) };
  }

  function copy(project, makeProject) {
    const suffix = ' (copy)';
    const fresh = makeProject(project.name.slice(0, 120 - suffix.length) + suffix);
    return { ...structuredClone(project), id: fresh.id, name: fresh.name, updated: fresh.updated, archived: false };
  }

  return { MAX_BYTES, templates, serialize, read, restore, copy };
});
