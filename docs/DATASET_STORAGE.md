# Browser dataset catalog

The browser research workspace now lists datasets and checks import quotas from a metadata-only IndexedDB store. An analytical tool still loads a single selected CSV by its existing SHA-256 key. Names, source fingerprints, timestamps, labels, diagnostics, and the source bytes keep their existing representation. The change applies to browser-local data.

Version 2 of `common-research-data-v1` adds `dataset_metadata` and backfills it by reading legacy records one at a time in the upgrade transaction. Raw CSV records stay in the original `datasets` store. Imports, duplicates, deletions, and clearing the library use a transaction spanning both stores, so the quota and metadata cannot diverge from source records during a partial write. The 16 MB per file, 20 dataset, and 64 MB aggregate limits remain in force.

The one-time upgrade scales with the size of the existing library. After upgrade, listing and quota checks read at most 20 small metadata records. With Chromium and eight legacy fixtures totaling 8,000,000 source bytes, the old bulk read took 30.2 ms and the metadata list took 0.8 ms on the same local test run. The catalog response was 745 JSON bytes for that fixture. This is a single observation with synthetic records. The test asserts that listing and quota checks use the metadata store, and does not enforce a timing threshold.

Run the existing dataset provenance suite and `node tests/workspace-dataset-storage.test.mjs` with a loopback static server and Playwright 1.56.1. The browser suite covers a v1 upgrade, original source retrieval, concurrent duplicate import, quota rollback, deletion, and clearing both stores. Test records live in a fresh Chromium context only.

Use a forward-compatible repair if rollback is needed after a user's browser upgrades. IndexedDB versions only increase. A previous release hard-coded to version 1 cannot open a version 2 database, even though the CSVs remain in their original store. If an old tab blocks migration, close or reload that tab and retry from the workspace.

Partial acceptance evidence applies to Q04.01, X01.05–06 and PLATFORM-017, 032–033. Cloud persistence, cross-device access, governed data ingestion, and object storage are tracked separately.
