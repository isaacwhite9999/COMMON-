"""Package the committed static site with isolated public-research configuration."""
from __future__ import annotations

import argparse
import hashlib
import hmac
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
from urllib.parse import unquote, urlsplit
from zipfile import ZIP_STORED, ZipFile, ZipInfo

PROFILE = "public-research"
APPROVAL = "Promote public research candidate"
REQUIRED = {
    "index.html", "preview.html", "terminal/index.html", "workspace/index.html",
    "lab/index.html", "live/index.html", "settings/appearance/index.html", "config.js",
}
DISABLED_CONFIG = {
    "supabaseUrl": "",
    "supabaseAnonKey": "",
    "communityBackendReady": False,
    "researchAgentEnabled": False,
    "externalLedgerEnabled": False,
    "financialOperationsEnabled": False,
}
CREDENTIAL_MARKERS = re.compile(
    rb"(?i)\b(?:https?://[a-z0-9.-]+\.supabase\.(?:co|com)\b"
    rb"|sb_(?:publishable|secret)_[a-z0-9_-]+|sk-(?:proj-)?[a-z0-9_-]{20,}"
    rb"|github_pat_[a-z0-9_]+|gh[pousr]_[a-z0-9]{20,})"
    rb"|-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----"
)
SOURCE_PATH = re.compile(r"(?:[a-z0-9][a-z0-9_-]*/)*[a-z0-9][a-z0-9_.-]*\.(?:html|css|js)")


def git(root: Path, *args: str) -> bytes:
    try:
        return subprocess.run(
            ["git", "-C", str(root), *args], check=True, capture_output=True,
        ).stdout
    except subprocess.CalledProcessError as error:
        raise ValueError(f"Git could not read the requested {args[0]} data.") from error


def commit_inputs(root: Path, commit: str) -> list[str]:
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or git(
        root, "cat-file", "-t", commit,
    ) != b"commit\n":
        raise ValueError("A full 40-character Git commit SHA is required.")
    paths = git(root, "show", f"{commit}:scripts/release_files.txt").decode().splitlines()
    if (
        any(not SOURCE_PATH.fullmatch(path) for path in paths)
        or len(set(paths)) != len(paths)
        or not REQUIRED.issubset(paths)
    ):
        raise ValueError("The release file list must contain safe unique paths and every required route.")
    return sorted(paths)


class ResourceLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src", "poster", "action"} and value:
                self.links.append(value)


def validate_assets(files: dict[str, bytes]) -> None:
    for name, content in files.items():
        if CREDENTIAL_MARKERS.search(content):
            raise ValueError(f"Provider or credential marker found in {name}.")
        if not name.endswith(".html"):
            continue
        parser = ResourceLinks()
        parser.feed(content.decode("utf-8"))
        for value in parser.links:
            link = urlsplit(value.strip())
            if link.scheme in {"https", "mailto", "data"}:
                continue
            path = unquote(link.path)
            if link.scheme or link.netloc or path.startswith("/") or "\\" in path:
                raise ValueError(f"Unsupported release URL in {name}.")
            if not path:
                continue
            parent = PurePosixPath(name).parts[:-1]
            parts = list(parent)
            for segment in path.split("/"):
                if segment == "..":
                    if not parts:
                        raise ValueError(f"Release URL escapes the site in {name}.")
                    parts.pop()
                elif segment not in {"", "."}:
                    parts.append(segment)
            target = "/".join(parts)
            index = "/".join((*parts, "index.html"))
            if target not in files and index not in files:
                raise ValueError(f"Missing release asset {target!r} referenced by {name}.")


def site_files(root: Path, commit: str) -> dict[str, bytes]:
    paths = commit_inputs(root, commit)
    tree = git(root, "ls-tree", "-rz", commit, "--", "docs")
    blobs: dict[str, bytes] = {}
    for entry in tree.split(b"\0"):
        if not entry:
            continue
        metadata, source_path = entry.split(b"\t", 1)
        name = os.fsdecode(source_path).removeprefix("docs/")
        if name not in paths:
            continue
        mode, kind, blob = metadata.split()
        if mode != b"100644" or kind != b"blob":
            raise ValueError(f"Expected a regular committed release file for {name}.")
        if name == "config.js":
            config = json.dumps(DISABLED_CONFIG, indent=2, sort_keys=True)
            blobs[name] = f"window.COMMON_CONFIG = Object.freeze({config});\n".encode()
        else:
            blobs[name] = git(root, "cat-file", "blob", blob.decode("ascii"))
    missing = set(paths) - blobs.keys()
    if missing:
        raise ValueError(f"Missing committed release files: {', '.join(sorted(missing))}.")
    blobs[".nojekyll"] = b""
    validate_assets(blobs)
    return blobs


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def archive(root: Path, commit: str) -> tuple[dict[str, bytes], bytes]:
    files = site_files(root, commit)
    manifest = {
        "schema": 1,
        "profile": PROFILE,
        "sourceCommit": commit,
        "files": {name: sha256(data) for name, data in sorted(files.items())},
    }
    files["release-manifest.json"] = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
    stream = io.BytesIO()
    with ZipFile(stream, "w", compression=ZIP_STORED) as target:
        for name, data in sorted(files.items()):
            info = ZipInfo(name)
            info.create_system = 3  # Unix file mode, independent of host.
            info.external_attr = 0o100644 << 16
            target.writestr(info, data)
    return files, stream.getvalue()


def verify_promotion(env: dict[str, str], reviewed_commit: str, digest: str, *, deploy: bool) -> None:
    if (
        env.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
        or env.get("GITHUB_REF") != "refs/heads/main"
        or env.get("COMMON_PROMOTION_ACKNOWLEDGEMENT") != APPROVAL
        or not re.fullmatch(r"[0-9a-f]{40}", reviewed_commit)
        or env.get("GITHUB_SHA") != reviewed_commit
        or not re.fullmatch(r"[0-9a-f]{64}", digest)
        or (deploy and env.get("COMMON_PUBLIC_RESEARCH_PROMOTION_ENABLED") != "true")
    ):
        raise ValueError("Public research promotion was denied.")


def verify_environment(policy: object, branches: object) -> None:
    if not isinstance(policy, dict) or not isinstance(branches, dict):
        raise ValueError("GitHub Pages environment policy could not be verified.")
    branch_policy = policy.get("deployment_branch_policy")
    rules = policy.get("protection_rules")
    policies = branches.get("branch_policies")
    if (
        policy.get("name") != "github-pages"
        or policy.get("can_admins_bypass") is not False
        or branch_policy != {"protected_branches": False, "custom_branch_policies": True}
        or not isinstance(rules, list)
        or not any(
            isinstance(rule, dict)
            and rule.get("type") == "required_reviewers"
            and rule.get("prevent_self_review") is True
            and isinstance(rule.get("reviewers"), list)
            and rule["reviewers"]
            for rule in rules
        )
        or branches.get("total_count") != 1
        or not isinstance(policies, list)
        or len(policies) != 1
        or not isinstance(policies[0], dict)
        or policies[0].get("name") != "main"
        or policies[0].get("type") != "branch"
    ):
        raise ValueError("GitHub Pages requires main-only deployment and independent approval without bypass.")


def build(root: Path, commit: str, output: Path, expected: str | None = None) -> str:
    files, package = archive(root, commit)
    digest = sha256(package)
    if expected is not None and not hmac.compare_digest(digest, expected):
        raise ValueError("The candidate SHA-256 differs from the reviewed digest.")
    output.mkdir(parents=True)
    for name, data in files.items():
        path = output / "site" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    (output / "public-research.zip").write_bytes(package)
    (output / "public-research.sha256").write_text(
        f"{digest}  public-research.zip\n", encoding="ascii",
    )
    return digest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    package = subcommands.add_parser("build")
    package.add_argument("--commit", required=True)
    package.add_argument("--output", required=True, type=Path)
    package.add_argument("--expected-sha256")
    promotion = subcommands.add_parser("authorize")
    promotion.add_argument("--commit", required=True)
    promotion.add_argument("--sha256", required=True)
    promotion.add_argument("--deploy", action="store_true")
    promotion.add_argument("--environment-policy", type=Path)
    promotion.add_argument("--branch-policies", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "authorize":
            verify_promotion(dict(os.environ), args.commit, args.sha256, deploy=args.deploy)
            if args.deploy:
                if args.environment_policy is None or args.branch_policies is None:
                    raise ValueError("GitHub Pages policy evidence is required for deployment.")
                verify_environment(
                    json.loads(args.environment_policy.read_text(encoding="utf-8")),
                    json.loads(args.branch_policies.read_text(encoding="utf-8")),
                )
        else:
            print(build(Path.cwd(), args.commit, args.output, args.expected_sha256))
    except (ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
