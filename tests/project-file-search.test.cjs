const assert = require('node:assert/strict');
const test = require('node:test');
const files = require('../docs/workspace/files.js');

test('project search is case-sensitive, literal and uses nonoverlapping matches', () => {
  const project = files.write(files.write({}, 'data/a.txt', 'a.*a.* A.*'), 'data/b.txt', 'aaaa');
  const matches = files.search(project, 'a.*');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].count, 2);
  assert.equal(files.search(project, 'aa')[0].count, 2);
  assert.throws(() => files.search(project, ''), /1–240/);
  const output = files.replaceReviewed(project, matches, new Set([matches[0].file.id]), 'a.*', '$&');
  assert.equal(output.files[0].content, '$&$& A.*');
  assert.equal(output.files[0].revisions[0].content, project.files[0].content);
  assert.deepEqual(output.files[1], project.files[1]);
});

test('stale previews and replacements beyond the per-file bound fail before any write', () => {
  const project = files.write(files.write({}, 'a.txt', 'x'), 'b.txt', 'x'.repeat(40000));
  const matches = files.search(project, 'x');
  const both = new Set(matches.map(match => match.file.id));
  assert.throws(() => files.replaceReviewed(project, matches, both, 'x', 'xx'), /b.txt would exceed/);
  const updated = files.write(project, 'b.txt', 'different', project.files[1].id);
  assert.throws(() => files.replaceReviewed(updated, matches, both, 'x', ''), /file changed/);
  assert.equal(project.files[0].content, 'x');
});
