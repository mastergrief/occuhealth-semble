# Git Push

Push local changes to remote. Reviews changes, creates meaningful commits, and pushes safely.

## Auto-accept paths
Files under these paths are staged without confirmation:
`src/`, `convex/`, `.claude/`, `.codex/`, `AGENTS.md`

**Step 1: Review** — Run `git status` (never use `-uall`), `git diff --stat`, and `git log --oneline -5` in parallel. Identify:
- What's staged vs unstaged vs untracked
- Any files that should NOT be committed (.env, credentials, large binaries, build output)
- Recent commit message style/conventions

**Step 2: Stage** — Auto-stage all changed/untracked files under auto-accept paths. For files outside those paths, flag them to the user and ask before staging. Apply the blocklist below regardless of path:

**Hard block** (never stage — reject silently):
- `.env*`
- `migration-export`, `migration-export-dir/`, `migration-checkpoints/`
- `**/*.token`, `**/*.pem`, `**/*.key`, `**/*.cert`, `**/*.p12`
- `**/*.pid`, `**/*.port`, `**/daemon-state.json`
- `node_modules/`

**Soft block** (warn user via `AskUserQuestion` before staging):
- `dist/`, `out/`, `build/`, `dev-dist/`, `coverage/`
- `__pycache__/`, `*.pyc`
- `*.tar.gz`, `*.zip`, `*.tgz`
- `*.sqlite`, `*.db`
- `*.har`
- `migrate.config.yaml`

**Step 3: Commit** — Write a concise commit message following the repo's existing convention (detected from Step 1 log). Summarize the "why", not the "what". Use a HEREDOC for the message.

**Step 4: Push** — Detect the current branch with `git branch --show-current`. Push with `git push -u origin <branch>`. If the branch is `main`, use `AskUserQuestion` to confirm before pushing.

**Step 5: Verify** — Run `git log origin/<branch>..HEAD` to confirm no unpushed commits remain. Report the pushed commit(s) to the user.

**Step 6: Deploy to Production** *(only if args contain "prod")* — Use `AskUserQuestion` to confirm: "Push to main AND deploy to prod?". On confirm, run `npx convex deploy --cmd 'npx vite build' -y` (timeout 180s). Report deploy target (`dashing-reindeer-259`) and success/failure. Note: Vercel auto-deploys from GitHub push — no manual step needed.

For full gated deployment with pre-flight checks and browser smoke tests, use `/push-prod` instead.
