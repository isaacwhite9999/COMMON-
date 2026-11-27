const assert = require('node:assert/strict');
const test = require('node:test');
const files = require('../docs/workspace/files.js');
const bundles = require('../docs/workspace/project-bundle.js');

function createProject(name) {
  return { id: crypto.randomUUID(), name, updated: new Date().toISOString(), runs: [] };
}

test('source bundles round-trip notes and revisions with fresh ownership and file identifiers', () => {
  let project = { ...createProject('Strategy'), notes: 'Time-ordered holdout', notebook: ['private'], link: 'private-id' };
  project = files.write(project, 'models/test.py', 'print(1)');
  project = files.write(project, 'models/test.py', 'print(2)', project.files[0].id);
  const exported = bundles.serialize(project);
  const restored = bundles.restore(bundles.read(exported), createProject);
  assert.notEqual(restored.id, project.id);
  assert.notEqual(restored.files[0].id, project.files[0].id);
  assert.equal(restored.notes, project.notes);
  assert.equal(restored.files[0].content, 'print(2)');
  assert.equal(files.restore(restored, restored.files[0].id, 0).files[0].content, 'print(1)');
  assert.equal(restored.notebook, undefined);
  assert.equal(restored.link, undefined);
});

test('invalid versions, unsafe paths, duplicates and oversized UTF-8 bundles are rejected', () => {
  const file = { path: 'notes.md', content: '', revisions: [] };
  const bundle = { format: 'common-project-sources', version: 1, name: 'Strategy', notes: '', files: [file] };
  const read = value => bundles.read(JSON.stringify(value));
  assert.throws(() => read({ ...bundle, version: 2 }), /Unsupported/);
  assert.throws(() => read({ ...bundle, files: [{ ...file, path: '../notes.md' }] }), /relative project path/);
  assert.throws(() => read({ ...bundle, files: [file, { ...file, path: 'NOTES.md' }] }), /duplicate/);
  assert.throws(() => read({ ...bundle, files: [{ ...file, revisions: [null] }] }), /revision date/);
  assert.throws(() => bundles.read('é'.repeat(bundles.MAX_BYTES / 2 + 1)), /exceeds/);
});

test('duplicate creates an independent active project', () => {
  const original = { ...createProject('Alpha'), archived: true, runs: [{ returns: [0] }] };
  const copy = bundles.copy(original, createProject);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.name, 'Alpha (copy)');
  assert.equal(copy.archived, false);
  copy.runs[0].returns[0] = 1;
  assert.equal(original.runs[0].returns[0], 0);
});
