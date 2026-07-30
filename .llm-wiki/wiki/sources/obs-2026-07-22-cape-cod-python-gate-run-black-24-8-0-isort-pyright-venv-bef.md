---
type: source
title: "Observation: cape-cod Python gate: run black 24.8.0 + isort + pyright (venv) before pushing"
slug: obs-2026-07-22-cape-cod-python-gate-run-black-24-8-0-isort-pyright-venv-bef
status: observation
created: 2026-07-22
updated: 2026-07-22
relevance: high
observed_at: 2026-07-22T13:02:29.892Z
tags: ["cape-cod", "python", "black", "pyright", "isort", "tooling", "ci", "pre-commit"]
source_context: "cape-cod PR #353 CI: black/pyright failing after push"
---
# ⭐ Observation: cape-cod Python gate: run black 24.8.0 + isort + pyright (venv) before pushing
cape-cod uses pre-commit-pinned black 24.8.0 + isort 5.13.2 (line-length 80, isort profile=black) and pyright for Python. When modifying cape-cod Python, run: `uvx black@24.8.0 --check <files>`, `uvx isort@5.13.2 --check <files>`, and `uvx pyright --pythonpath ./venv/bin/python <files>` (the --pythonpath is required or pyright reports false reportMissingImports for boto3/botocore/capepy/pytest since uvx lacks the project venv). ./venv already has those deps. Lesson: pytest alone is not sufficient before pushing; the repo's format+type gates must pass. A programmatic `git commit` bypasses pre-commit hooks, so run the tools manually. On PR #353, black reformatted a spot in post_workflow_run.py and pyright flagged an unguarded importlib spec_from_file_location (ModuleSpec | None) in test_workflow_user_attribution.py's _load_module; fixed with a None guard.
*Relevance: high*

*Context: cape-cod PR #353 CI: black/pyright failing after push*

*Tags: cape-cod python black pyright isort tooling ci pre-commit*
---
*Observed: 2026-07-22T13:02:29.892Z*