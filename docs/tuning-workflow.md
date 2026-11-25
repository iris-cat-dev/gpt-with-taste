# Prompt tuning workflow

This guide captures the end-to-end workflow for refining `recipe/*.md`, verifying behavior on real models without regressing core GPT with Taste traits, compressing prompt bloat safely, and deploying updates to a local harness.

For the build pipeline and target adapters, see [docs/authoring.md](authoring.md). For where each capability lives across the six sources, see [docs/prompt-map.md](prompt-map.md).

## 1. Diagnose from real failure diffs, not abstract wishes

Start with a real task where output fell short, ideally comparing two runs on the same prompt, repository state, and tool access (baseline vs. candidate, or a weaker run vs. a stronger reference run).

Before editing any text, isolate which layer actually caused the failure:

- **Delivery gap**: Did the relevant rule reach the model on the failing turn? Check the harness adapter's actual message projection before assuming the model ignored an instruction.
- **Internal contradiction**: Are two clauses in the recipe pulling in opposite directions (for example, “use the lightest useful artifact” colliding with “explain for a reader with zero project background”, or “keep raw identifiers out of openings” colliding with file anchors in delivery updates)?
- **Scope gap**: Does a rule apply only to explicit “explain X” requests when the failure happened during a bug diagnosis, fix delivery, code review, or design tradeoff?
- **Host-prompt gravity**: Is a terse host system prompt overriding a mildly phrased preference in the recipe?
- **Signal dilution**: Is the decisive instruction buried inside duplicated prose or a bloated steer file?

Edit only after naming the exact cause. Adding new adjectives on top of an unresolved conflict usually makes the prompt longer and less reliable.

## 2. Map where each prompt actually lands at runtime

Always check how the target harness injects `main.md` and `*-steer.md` across multi-turn tool calls before deciding where to place a rule.

In the OMP adapter (`adapters/omp/runtime/runtime.mjs`), the lifecycle has two distinct layers:

1. `before_agent_start` appends the full role prompt (`main.md`, `sub.md`, or `independent.md`) as a separate block in `systemPrompt` (with fallback restoration as a `developer` message on Responses APIs if overridden).
2. `context` injects `user-steer.md`, `sub-steer.md`, or `agent-steer.md` only for messages with `index > lastAssistant` (unanswered inputs newer than the last assistant message).

**Consequence for multi-turn tool tasks**: As soon as the assistant makes a tool call (reading code, running `git log`, grepping callers), `lastAssistant` advances past the user message. On the final answer turn, `user-steer.md` is no longer present—the response is governed solely by `main.md`.

**Design rule**:

- Do **not** modify `adapters/omp/runtime/runtime.mjs` to keep `user-steer.md` attached after tool turns. Doing so breaks `adapters/omp/test.mjs` steering-isolation expectations and destabilizes prompt-caching prefixes.
- Make `recipe/main.md` (and `recipe/independent.md` for controller-free hosts) **high-salience and self-contained** for every rule that must survive tool loops.
- Keep `recipe/user-steer.md` short and strictly aligned with `main.md` as a turn-start reinforcement, never as the sole home of a required behavior.
- Keep user-facing explanatory verbosity out of `recipe/sub.md`, `recipe/sub-steer.md`, and `recipe/agent-steer.md` so delegated workers return tight, action-ready handoffs to the parent.

## 3. Edit, de-conflict, and compress `recipe/*.md`

Author all behavioral edits exclusively in `recipe/*.md` (and update `docs/prompt-map.md` whenever capability summaries or groupings change). Never hand-edit generated files under `dist/` or `prompts/`.

Apply these editing rules while refining:

- **Keep examples domain-independent**: Never copy a specific benchmark prompt, PR number, repository path, or private bug into `recipe/*.md`. Extract the general principle and illustrate it with a domain-neutral example (for example, composite-index leftmost-prefix lookup or complement failure-rate math such as `99% → 96%` meaning misses rose from `1%` to `4%`, or 4×).
- **Decouple code restraint from explanation thoroughness**: When improving explanation clarity, state explicitly that *code implementations* stay minimal and direct while *user-facing explanations* prioritize zero-background clarity over saving tokens. Without that split, models either over-engineer code or clip explanations back into terse shorthand.
- **Resolve conflicts by scoping audience and surface**: Explicitly scope brevity rules (such as “use the lightest useful artifact”) to *internal collaborator handoffs*, UI copy-omission rules to *UI interfaces*, and short answers to *trivial confirmations* or *single-point yes/no questions* (verdict + plain reason + 1–2 concrete boundary forks).
- **Prefer lossless deduplication over piling on rules**: After several tuning rounds, audit all six `recipe/*.md` files for repeated clauses (anti-hedging, verification reuse, collaborator routing, defensive-disclaimer examples) and merge each into a single crisp rule where its responsibility lives.
- **Preserve contract anchors**: Keep the opening phrases asserted by `scripts/build.test.mjs` (`Own the result the user is trying to achieve`, `Own the complete result assigned to you`, `Turn the user's intent`, `user's purpose`, `parent's goal`, `Reconcile this message or task result`) and the section headings and concrete examples referenced in `docs/prompt-map.md` (`exhibition loan`, `BLEU`, `BUTTON_GUIDE.md`, `matrix-multiplication`).

## 4. Run mechanical build and contract checks first

Before spending model calls on live evaluation, compile every target and run the offline test suite:

```sh
npm run build && npm run build:check && npm test
```

Verify that:

- All generated targets (`claude`, `codex`, `dsh`, `kiki`, `omp`, `pi`) and `prompts/` rebuild cleanly with zero drift.
- `scripts/build.test.mjs`, `hooks/steer.test.mjs`, `scripts/install.test.mjs`, `adapters/claude/claude.test.mjs`, `adapters/pi/test.mjs`, and `adapters/omp/test.mjs` all pass.
- Word and byte counts across `recipe/*.md` (`wc -l -w -c recipe/*.md`) move in the intended direction without unexpectedly shrinking a section you meant to preserve.

## 5. Run a balanced live regression matrix

Unit tests prove packaging, discovery, and event routing, not model output quality. Validate every substantive prompt edit or compression pass against the target model (`gpt-6.1-sol` / `gpt-6-astra`) using a small, balanced 4-case matrix that tests **both the targeted improvements and the core Taste guardrails**:

| Case | Mode | What it proves | Pass criteria |
| --- | --- | --- | --- |
| **1. Multi-tool codebase bug diagnosis** | With tools in a real repo | `main.md` governs final replies even after tool calls drop `user-steer.md` | Inspects relevant code and `git log` / introducing commit; sets normal flow first; names each concrete guard-breaking trigger (no “etc.” hand-waving); walks through a concrete scenario; clean numbered sections without choppy single-line breaks. |
| **2. Dense technical explanation** | `--no-tools` | Zero-background clarity on complex causal + numerical facts | Plain-language opening without raw identifier walls; translates jargon on first mention beside exact inline anchors; explains mechanism visually or structurally; computes revealing ratios/averages inline; ends with a relay-ready one-sentence takeaway. |
| **3. Simple engineering choice (yes/no)** | `--no-tools` | Thoroughness did not break Taste's decisiveness or bloat short answers | Direct verdict first; minimal code (if applicable) with plain explanation of subtle pitfalls; 1–2 concrete boundary forks that flip the choice; stops without empty scaffolding. |
| **4. Short code review & minimal fix** | `--no-tools` | Explanatory depth did not weaken code minimalism or contract honesty | Smallest reliable fix without speculative options or redundant guards; explains fixes clearly with first-mention term translations; flags behavior/contract changes explicitly. |

Run each case in an isolated OMP CLI invocation pointing directly at the freshly built `./dist/omp/index.js`:

```sh
omp --print --mode json --no-session \
  --no-skills --no-rules --no-context-files --no-extensions \
  -e ./dist/omp/index.js \
  --model <provider/model> --thinking high \
  "<prompt>" < /dev/null
```

Operational details that prevent misleading runs:

- Pass `--no-skills --no-rules --no-context-files --no-extensions` so ambient user rules, workspace `AGENTS.md`, or previously installed extensions do not contaminate the measurement.
- Always close stdin (`< /dev/null` in shell, or `stdio: ['ignore', 'pipe', 'pipe']` in Node `spawn`), or `omp --print` will block waiting for piped input.
- Run the four cases in parallel and inspect **both** structural metrics (character count, blank-line break count, tool-call trace) and the full rendered prose—never judge quality by length alone.

If a case regresses (for example, a compression pass drops `git log` inspection, reintroduces choppy single-sentence blank lines, or bloats Case 3), narrow the edit to the responsible paragraph in `recipe/*.md`, rebuild, and re-run the matrix before proceeding.

For a document-writing change, add a matched baseline/candidate comparison of **the artifacts themselves**. Give the model the same facts to produce two different genres (for example, a quickstart and release notes), then inspect a native Plan-mode review separately. Check that the quickstart leads to a visible result, the release notes tell affected users what changed and what action to take, and the plan carries the decision, ordered work, and observable acceptance without relying on the chat. Keep one existing template or targeted-revision constraint in the comparison where relevant. Verify that the host still accepts the plan through its native submission path; a good final reply is not evidence about the Markdown body.

## 6. Deploy locally with an atomic swap (OMP)

Keep only **one** `gpt-with-taste` installation under `~/.omp/agent/extensions/`: OMP auto-discovers any `index.js` inside `extensions/`, so leaving a renamed backup or staging folder there causes duplicate loading. Store backups and staging directories outside `extensions/` (for example, under `~/.omp/cache/`).

Deploy `dist/omp/` atomically from the repository root:

```sh
set -euo pipefail
mkdir -p "$HOME/.omp/cache"
stage="$(mktemp -d "$HOME/.omp/cache/gpt-with-taste-stage.XXXXXX")"
prev="$HOME/.omp/cache/gpt-with-taste-prev.$$"
target="$HOME/.omp/agent/extensions/gpt-with-taste"

cp -R dist/omp/. "$stage/"
chmod 755 "$stage"

[ -e "$target" ] && mv "$target" "$prev"
if ! mv "$stage" "$target"; then
  [ -e "$prev" ] && mv "$prev" "$target"
  rm -rf "$stage"
  exit 1
fi
rm -rf "$prev"
```

Verify the installed copy immediately after swapping:

```sh
diff -rq dist/omp "$HOME/.omp/agent/extensions/gpt-with-taste"
ls -la "$HOME/.omp/agent/extensions/"
node --input-type=module -e '
const mod = await import(process.env.HOME + "/.omp/agent/extensions/gpt-with-taste/index.js");
if (typeof mod.default !== "function") throw new Error("Expected default export function");
console.log("ESM smoke-load OK");
'
```

Restart OMP Desktop or open a new session so the host loads the updated prompt files.

## 7. Commit and push cleanly

1. Confirm `npm run build:check` passes with zero drift.
2. Check repository-local Git identity (`git config --local user.name` and `git config --local user.email`) if this checkout uses a different author identity from your global Git config.
3. Stage `recipe/`, `docs/` (when updated), `dist/`, and `prompts/` together so the committed generated artifacts always match the author sources.
4. Push and confirm `git status --short --branch` is clean.
