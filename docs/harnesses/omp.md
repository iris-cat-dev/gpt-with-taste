# Oh My Pi (OMP)

Use the OMP adapter to add GPT with Taste to the main session and native child sessions without replacing OMP's built-in prompt, live tool catalog, environment footer or per-spawn assignment. The default entry uses OMP's `ctx.agent.kind` to select Main or Sub. It applies to selected models whose IDs start with `gpt-`, regardless of provider, including custom and third-party OpenAI-compatible providers.

Requires **OMP 18.11.0+** (`@oh-my-pi/pi-coding-agent`). The adapter has no runtime dependencies and makes no extra model calls.

## Enable for one session

From this repository:

```sh
node scripts/build.mjs --target omp
omp -e ./dist/omp/index.js
```

`--hook ./dist/omp/index.js` is also accepted by the current extension runner. Use one of these flags, not both. Run `/taste status` inside OMP to see the detected role, selected-model scope decision, steering state and resource location. The status command does not call a model; sending a prompt uses your configured provider as usual.

For persistent project use, copy the **whole** `dist/omp` directory to a new `<project>/.omp/extensions/gpt-with-taste` directory, then restart OMP. User-wide extension directories follow the active profile: normally `~/.omp/agent/extensions`, or `~/.omp/profiles/<profile>/agent/extensions` with `--profile`. The `index.js` entry is auto-discovered. Do not place this package directly in `.omp/hooks/`; ambient hook factories are discovered in `hooks/pre/` and `hooks/post/`, and this multi-file package belongs in `extensions/`.

Keep only one installation active. Existing `APPEND_SYSTEM.md`, `SYSTEM.md` and `SYSTEM_TEMPLATE.md` need no changes. In particular, do not replace the bundled instruction template to enable this adapter. OMP does not pass ordinary append-system text into Task children; this extension uses native child identity and the child's own event callbacks instead.

## Control and recover

- `/taste off` disables this branch's additions. On the next input preparation, its separate system block is removed; already-prepared in-flight continuations can retain the current block. Restart without the adapter for an immediate clean session.
- `/taste on` enables additions again, within provider/model scope.
- `/taste steer off` keeps the full role text but disables reminders; `/taste steer on` restores them.
- `/taste reset` clears branch overrides. Overrides survive resume and follow the active branch; each child has its own branch state.

To disable a one-session load, exit OMP and omit `-e` or `--hook` on the next launch. For a copied installation, move the `gpt-with-taste` directory **out of** `extensions/` and restart; move it back and restart to restore it. Renaming the directory inside `extensions/` does not disable its discoverable `index.js`.

If startup reports missing or empty resources, rebuild and replace the entire copied directory, then restart. Edit behavior in `recipe/`, not `dist/`. If role detection reports missing agent identity, upgrade OMP or provide an explicit-role factory in a host integration that knows its session role; the adapter does not guess from depth, UI availability, input transport or prompt prose.

## Main, Sub and completed results

OMP 18.11.0 exposes `ctx.agent.kind` as `main` or `sub`, including spawned sessions at depth zero. OMP rebinds the loaded factory to child sessions. Main receives full Main plus User Steer; native children always receive full Sub plus Sub Steer, even when the root factory selects Main or Independent explicitly. Child inputs never receive User Steer. `dist/omp/independent.js` selects Independent with steering off for the root session; its native Task and `/tan` children still receive Sub plus Sub Steer. Load it instead of `index.js`.

For a host that explicitly supplies the role, opts into provider filtering or needs custom model ID matching:

```js
import {createTasteExtension} from '/absolute/path/to/dist/omp/runtime.mjs';
export default createTasteExtension({
  role: 'sub',
  providers: ['your-provider'],
  modelIdPattern: /^your-model$/,
});
```

Omit `providers` to accept any selected provider. Supplying an array opts into filtering by exact provider ID; `providers: []` excludes all providers. The default `modelIdPattern` remains `/^gpt-/` even with a provider filter. Override it to match a custom model ID that does not start with `gpt-`, as in the example.

Use an explicit role only where the host guarantees it. Scope follows the selected model, not a virtual model's routed physical target. If the host disables extension loading in a restricted child, it must explicitly arrange the child entry; the generated `sub.md` is also available for direct role composition.

Main receives Agent Steer through two native completion boundaries:

- A non-error `task` tool result with no async handle and a nonempty `details.results` array whose results all have `exitCode === 0`, no abort and no error. The callback returns **only** `additionalContext`; original content, details and status remain intact.
- An agent-attributed `async-result` custom message whose `details.jobs` contains a `type: 'task', status: 'completed'` result. The request-local reminder follows that message, including a mixed delivery with another failed job; it does not declare the whole batch successful.

Ordinary tools, spawn acknowledgments, running handles, errors, timeouts and cancellations do not trigger a completion reminder. Task uses its own `SingleResult` contract, not Codex's `status.completed`. Sub and Independent do not receive parent Agent Steer.

## Generated files and delivery

`adapters/omp/build.mjs` renders `dist/omp/` from the six recipe texts. The package contains `index.js`, `independent.js`, `runtime.mjs`, `payload.mjs`, `texts.json`, its six Markdown resources, `package.json`, `PROVENANCE.md`, `THIRD_PARTY_LICENSE` and `build-manifest.json`.

`before_agent_start` appends one separate role block to the existing system-block array, preserving built-in instructions and every footer/assignment block. `context` inserts request-local hidden reminders after unanswered inputs and completed async Task deliveries newer than the last assistant response. Reprojection replaces this adapter's own additions rather than accumulating them; ordinary tool continuations do not repeat User Steer.

The final-payload guard restores a missing full role block for OpenAI Responses/Codex Responses, Chat Completions with an existing system/developer message, and TRAE raw-chat requests with `config_name`, `model_name` and an existing system/developer message in `messages`. TRAE's native routing fields remain unchanged; no synthetic `model` field is added. The guard preserves host instructions, tools and metadata and leaves an already-present role block untouched. Unknown or malformed wire formats still warn; system-block augmentation remains active, but recovering from a later forced-prompt replacement requires a guard for that format. Later payload-rewriting extensions can override delivery.

Run the model-free consumer fixture:

```sh
node adapters/omp/test.mjs
```

It imports the generated entry, registers and invokes callbacks, and checks default custom-provider support, opt-in provider filters, model ID matching, native role isolation, complete text delivery, host-block preservation, Task and async-result positive/negative cases, unchanged tool results, OpenAI-compatible and TRAE payload preservation, unsupported-format warnings, repeat projection and off/reset controls. It does not contact a provider.

Thanks to [SpadeLushen/pi-gpt-with-taste](https://github.com/SpadeLushen/pi-gpt-with-taste) for the request-local input projection and OpenAI final-payload guard adapted here under MIT. `PROVENANCE.md` records the source commit and OMP-specific changes; `THIRD_PARTY_LICENSE` retains the license.

API references: [OMP extension types](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts), [hook/extension loading](https://github.com/can1357/oh-my-pi/blob/main/docs/hooks.md), [Task results](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/task.md), [system-prompt customization](https://github.com/can1357/oh-my-pi/blob/main/docs/system-prompt-customization.md).
