#!/usr/bin/env python3
"""
Quick deploy to Hugging Face Space after edits.

Prerequisites:
  - Node.js 20+ and npm install completed
  - Hugging Face credentials configured (git credential or HF CLI)

Usage:
  python deploy.py
  python deploy.py --skip-check
  python deploy.py --message "fix banish bug"
  python deploy.py --dry-run
  python deploy.py --init          # first-time setup: git init + add remote
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HF_REMOTE = "huggingface"
HF_BRANCH = "main"
SPACE_URL = "https://huggingface.co/spaces/moamed12/bus-game"
IS_WINDOWS = platform.system() == "Windows"


def run(cmd: list[str], *, dry_run: bool = False, cwd: Path = ROOT) -> None:
    printable = " ".join(cmd)
    print(f"> {printable}")
    if dry_run:
        return
    # On Windows, use shell=True so .cmd shims (npm, npx, etc.) are found
    result = subprocess.run(cmd, cwd=cwd, check=False, shell=IS_WINDOWS)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def git_output(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        shell=IS_WINDOWS,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def init_repo() -> None:
    """First-time setup: git init + add HF remote."""
    if git_output(["rev-parse", "--is-inside-work-tree"]) != "true":
        print("Initializing git repository...")
        run(["git", "init"])
        run(["git", "branch", "-M", HF_BRANCH])
    remotes = git_output(["remote"])
    if HF_REMOTE not in remotes.splitlines():
        print(f"Adding remote '{HF_REMOTE}'...")
        run(["git", "remote", "add", HF_REMOTE,
             f"https://huggingface.co/spaces/moamed12/bus-game"])
    print("Repository initialized and remote configured.")


def preflight() -> None:
    if not (ROOT / "package.json").exists():
        raise SystemExit(f"package.json not found in {ROOT}")
    if git_output(["rev-parse", "--is-inside-work-tree"]) != "true":
        raise SystemExit(
            "Not a git repository. Run:\n"
            "  python deploy.py --init\n"
            "to set up the repo and remote automatically."
        )
    remotes = git_output(["remote"])
    if HF_REMOTE not in remotes.splitlines():
        raise SystemExit(
            f"Missing git remote '{HF_REMOTE}'. Run:\n"
            f"  python deploy.py --init\n"
            f"to set it up automatically."
        )


def has_changes() -> bool:
    status = git_output(["status", "--porcelain"])
    return bool(status)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build, commit, and deploy to Hugging Face Space")
    parser.add_argument("--init", action="store_true", help="Initialize git repo and add HF remote")
    parser.add_argument("--skip-check", action="store_true", help="Skip TypeScript check (npm run check)")
    parser.add_argument("--message", help="Custom commit message")
    parser.add_argument("--dry-run", action="store_true", help="Print steps without executing")
    args = parser.parse_args()

    if args.init:
        init_repo()
        return

    preflight()

    if not args.skip_check:
        run(["npm", "run", "check"], dry_run=args.dry_run)

    run(["npm", "run", "build"], dry_run=args.dry_run)

    run(["git", "add", "-A"], dry_run=args.dry_run)

    if has_changes() or args.dry_run:
        timestamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = args.message or f"deploy: {timestamp}"
        run(["git", "commit", "-m", message], dry_run=args.dry_run)
    else:
        print("No changes to commit.")

    run(["git", "push", HF_REMOTE, HF_BRANCH, "--force"], dry_run=args.dry_run)

    print(f"\nDeploy complete: {SPACE_URL}")


if __name__ == "__main__":
    main()
