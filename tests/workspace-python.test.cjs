const assert=require('node:assert/strict'),P=require('../docs/workspace/python-runtime.js');assert.deepEqual(P.input('print(2)',['numpy','numpy']),{code:'print(2)',libs:['numpy']});assert.throws(()=>P.input('x',['arbitrary-package']));assert.throws(()=>P.input('',[]));assert.throws(()=>P.input('x'.repeat(40001),[]));const doc=P.frameDocument();assert.ok(doc.includes("default-src 'none'"));assert.ok(doc.includes("worker-src blob:"));assert.ok(doc.includes(P.BASE));assert.ok(!doc.includes('allow-same-origin'));console.log('Python runtime input and isolation document checks passed');
const standard = P.environment([]);
assert.deepEqual(standard.dependencies, []);
assert.equal(standard.runtime.python, '3.12.7');
assert.equal(standard.lock.url, P.BASE+'pyodide-lock.json');
assert.match(standard.lock.sha256, /^[a-f0-9]{64}$/);
const stats = P.environment(['statsmodels', 'numpy', 'statsmodels']);
assert.deepEqual(stats.requested, ['numpy', 'statsmodels']);
assert.deepEqual(stats.dependencies.map(pkg => [pkg.name, pkg.version]), [
  ['numpy', '2.0.2'],
  ['openblas', '0.3.26'],
  ['packaging', '24.2'],
  ['pandas', '2.2.3'],
  ['patsy', '0.5.6'],
  ['python-dateutil', '2.9.0.post0'],
  ['pytz', '2024.1'],
  ['scipy', '1.14.1'],
  ['six', '1.16.0'],
  ['statsmodels', '0.14.4'],
]);
for (const pkg of stats.dependencies) assert.match(pkg.sha256, /^[a-f0-9]{64}$/);
assert.deepEqual(stats, P.environment(['numpy', 'statsmodels']));
stats.dependencies.find(pkg => pkg.name === 'statsmodels').dependencies.length = 0;
assert.ok(P.environment(['statsmodels']).dependencies.find(pkg => pkg.name === 'statsmodels').dependencies.length);
assert.equal(P.packageVersion('numpy'), '2.0.2');
assert.throws(() => P.environment(['__proto__']), /Unsupported package/);
assert.throws(() => P.environment(['openblas']), /Unsupported package/);
console.log('Pinned runtime manifest, transitive dependencies and request allowlist passed');
