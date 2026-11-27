import io
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

from scripts import release_candidate as release


class CandidateTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.test")
        self.git("config", "user.name", "COMMON release fixture")
        self.write("scripts/release_files.txt", "\n".join(sorted(release.REQUIRED)))
        for name in release.REQUIRED:
            content = '<a href="./">Home</a>' if name.endswith("index.html") else ""
            self.write(f"docs/{name}", content)
        self.write("docs/index.html", '<script src="./config.js"></script><a href="./workspace/#research">Research</a>')
        self.production = 'window.COMMON_CONFIG = { communityBackendReady:true,supabaseUrl:"https://fixture.supabase.co",supabaseAnonKey:"sb_publishable_fixture" };'
        self.write("docs/config.js", self.production)
        self.write("docs/notes.md", "Internal operational material")
        self.write("docs/unlisted.js", 'throw Error("Unlisted script");')
        self.commit = self.save()

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True).strip()

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(exist_ok=True, parents=True)
        path.write_text(content, encoding="utf-8")

    def save(self):
        self.git("add", "-A")
        self.git("commit", "-qm", "Fixture")
        return self.git("rev-parse", "HEAD")

    def test_archive_is_reproducible_isolated_and_complete(self):
        before, archive = release.archive(self.root, self.commit)
        self.write("docs/index.html", "Uncommitted modification")
        self.write("docs/config.js", "Uncommitted configuration")
        after, again = release.archive(self.root, self.commit)
        self.assertEqual(before, after)
        self.assertEqual(archive, again)
        self.assertTrue(release.REQUIRED.issubset(after))
        self.assertNotIn("notes.md", after)
        self.assertNotIn("unlisted.js", after)
        config = re.fullmatch(rb"window\.COMMON_CONFIG = Object\.freeze\((.*)\);\n", after["config.js"], re.S)
        self.assertIsNotNone(config)
        actual = json.loads(config[1])
        self.assertEqual(actual["supabaseUrl"], "")
        self.assertEqual(actual["supabaseAnonKey"], "")
        for key in ("communityBackendReady", "researchAgentEnabled", "externalLedgerEnabled", "financialOperationsEnabled"):
            self.assertIs(actual[key], False)
        manifest = json.loads(after["release-manifest.json"])
        self.assertEqual(manifest["sourceCommit"], self.commit)
        self.assertEqual(manifest["profile"], "public-research")
        with ZipFile(io.BytesIO(archive)) as package:
            self.assertEqual(package.namelist(), sorted(after))
            for name, expected in manifest["files"].items():
                self.assertEqual(release.sha256(package.read(name)), expected)

    def test_rejects_leaked_provider_configuration_and_broken_assets(self):
        for content, reason in [
            ('<a href="https://fixture.supabase.co/">Configuration</a>', "Provider or credential"),
            ('<script src="./unlisted.js"></script>', "Missing release asset"),
            ('<a href="../outside">Outside</a>', "escapes the site"),
            ('<a href="/workspace/">Wrong Pages prefix</a>', "Unsupported release URL"),
        ]:
            with self.subTest(reason=reason):
                self.write("docs/index.html", content)
                with self.assertRaisesRegex(ValueError, reason):
                    release.archive(self.root, self.save())

    def test_rejects_allowlisted_symlinks(self):
        path = self.root / "docs/config.js"
        path.unlink()
        path.symlink_to("unlisted.js")
        with self.assertRaisesRegex(ValueError, "regular committed release file"):
            release.archive(self.root, self.save())

    def test_build_digest_mismatch_creates_no_files(self):
        output = self.root / "candidate"
        with self.assertRaisesRegex(ValueError, "differs"):
            release.build(self.root, self.commit, output, "0" * 64)
        self.assertFalse(output.exists())
        self.assertEqual((self.root / "docs/config.js").read_text(), self.production)
        digest = release.build(self.root, self.commit, output)
        self.assertEqual(release.sha256((output / "public-research.zip").read_bytes()), digest)

    def test_promotion_requires_dispatch_main_exact_sha_and_enablement(self):
        digest = "9" * 64
        approved = {
            "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_SHA": self.commit,
            "COMMON_PROMOTION_ACKNOWLEDGEMENT": release.APPROVAL,
            "COMMON_PUBLIC_RESEARCH_PROMOTION_ENABLED": "true",
        }
        release.verify_promotion(approved, self.commit, digest, deploy=True)
        for key, substitute in [
            ("GITHUB_EVENT_NAME", "push"),
            ("GITHUB_REF", "refs/heads/feature"),
            ("GITHUB_SHA", "1" * 40),
            ("COMMON_PROMOTION_ACKNOWLEDGEMENT", "Decline"),
            ("COMMON_PUBLIC_RESEARCH_PROMOTION_ENABLED", ""),
        ]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                release.verify_promotion(approved | {key: substitute}, self.commit, digest, deploy=True)
        for bad_commit, bad_digest in [("main", digest), (self.commit, "abc")]:
            with self.assertRaises(ValueError):
                release.verify_promotion(approved, bad_commit, bad_digest, deploy=False)

    def test_promotion_requires_independent_environment_review(self):
        policy = {
            "name": "github-pages",
            "can_admins_bypass": False,
            "deployment_branch_policy": {"protected_branches": False, "custom_branch_policies": True},
            "protection_rules": [
                {"type": "required_reviewers", "prevent_self_review": True, "reviewers": [{"id": 1}]},
            ],
        }
        branch = {"name": "main", "type": "branch"}
        branches = {"total_count": 1, "branch_policies": [branch]}
        release.verify_environment(policy, branches)
        for unsafe_policy, unsafe_branches in [
            (policy | {"can_admins_bypass": True}, branches),
            (policy | {"protection_rules": [{"type": "branch_policy"}]}, branches),
            (policy | {"protection_rules": [{"type": "required_reviewers", "reviewers": []}]}, branches),
            (policy, branches | {"total_count": 2}),
            (policy, branches | {"branch_policies": [branch | {"type": "tag"}]}),
        ]:
            with self.assertRaisesRegex(ValueError, "main-only deployment"):
                release.verify_environment(unsafe_policy, unsafe_branches)


if __name__ == "__main__":
    unittest.main()
