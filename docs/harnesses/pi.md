# Pi

Use the Pi adapter to add GPT with Taste while retaining Pi's system prompt, tools, project instructions, skills and permission decisions. The default entry applies Main and request-local User Steer to selected models whose IDs start with `gpt-`, from any provider, including custom and third-party providers.

Requires **Pi 1.2.0+** (`@earendil-works/pi-coding-agent`) and **Node.js 22.19+**. The adapter has no runtime dependencies and makes no extra model calls.

## Install

```sh
pi install git:github.com/NB-Corp/gpt-with-taste
```

Pi loads the generated adapter through the repository's root `pi.extensions` entry. Run `/reload` in an existing session after installation, then `/taste status` to see the role, selected-model scope decision, steering state and resource location. The status command does not call a model.

Run `pi update --extensions` when you want the latest committed adapter. Remove it with `pi remove git:github.com/NB-Corp/gpt-with-taste`.

## Try a local build

From this repository:

```sh
node scripts/build.mjs --target pi
pi -e ./dist/pi/index.js
```

For a copied project installation, place the **whole** `dist/pi` directory in `<project>/.pi/extensions/gpt-with-taste`. For user-wide use, copy it to `<agent-dir>/extensions/gpt-with-taste`, normally `~/.pi/agent/extensions/gpt-with-taste`, then restart Pi. Project extensions follow Pi's project-trust controls.

Keep one installation active: use the package, a local `-e` entry or a copied directory. This adapter does not need `.pi/APPEND_SYSTEM.md` or `SYSTEM.md`; leave existing files unchanged.

## Control and recover

- `/taste off` stops future request-local additions on the current session branch.
- `/taste on` enables them again, within the configured provider/model scope.
- `/taste steer off` keeps the full role text but disables input/result reminders; `/taste steer on` restores them.
- `/taste reset` clears branch overrides. Overrides survive resume and follow the active branch.

To disable a one-session load, exit Pi and omit `-e` on the next launch. For a copied installation, move the `gpt-with-taste` directory **out of** `extensions/` and restart Pi; move it back and restart to restore it. Do not rename only the directory inside `extensions/`, because Pi would still discover `index.js`.

If startup reports a missing or empty text file, rebuild and replace the complete copied directory, then restart Pi. Change behavior in `recipe/`, never in the generated Markdown. If a final-request warning names an unsupported payload format, the Pi system section still applies, but recovering from a forced system-prompt replacement requires a guard for that provider's wire format. A later payload-rewriting extension can also override delivery; load it deliberately and inspect its effect.

## Choose a collaborator role

Pi's `input.source` describes transport (`interactive`, `rpc`, `extension`), not agent identity. A child integration must load `dist/pi/sub.js` **instead of** `index.js`, or use the factory:

```js
import {createTasteExtension} from '/absolute/path/to/dist/pi/runtime.mjs';
export default createTasteExtension({role: 'sub'});
```

Sub uses the full Sub text and Sub Steer for its unanswered inputs. It does not receive User Steer or completed-result Agent Steer. `dist/pi/independent.js` selects Independent with steering off. These entries preserve the child's own assignment, tools, model and authority; the child loader must actually load the chosen entry.

A parent integration can declare custom message types that guarantee a completed collaborator result:

```js
import {createTasteExtension} from '/absolute/path/to/dist/pi/runtime.mjs';
export default createTasteExtension({
  completedResultTypes: ['my-collaborator:completed'],
});
```

The collaborator delivers its actual result with Pi's `sendMessage` API and that exact `customType`. The adapter preserves the result and adds request-local Agent Steer after it. Use different types for progress, failures, timeouts and background handles. Ordinary tool results have no completion adapter by default; a tool integration must signal its concrete completion contract through the declared custom message type. This adapter does not poll or trigger additional turns.

No provider whitelist is applied by default. To restrict providers, pass an explicit `providers` array to the factory; `providers: ['your-provider']` accepts only that selected provider, and `providers: []` excludes all providers. The `gpt-` model-ID requirement still applies. For a provider using a different model alias, customize `modelIdPattern`, for example `modelIdPattern: /^your-model$/`; this changes matching, not the selected model ID. Scope follows the selected model, not a virtual model's routed physical target. Load the wrapper instead of the default entry.

## Generated files and delivery

`adapters/pi/build.mjs` renders `dist/pi/` from the six recipe texts. The generated package contains:

- `index.js`, `sub.js`, `independent.js`: host-loadable entries;
- `runtime.mjs`, `projection.mjs`, `payload.mjs`: transport code;
- `texts.json` and the six Markdown files it names: runtime resources;
- `package.json`, `PROVENANCE.md`, `THIRD_PARTY_LICENSE`, `build-manifest.json`: package and build metadata.

`context_with_system` adds a dedicated `gpt_with_taste` section without replacing host sections. It projects hidden reminders only after inputs or declared completed custom messages newer than the last assistant response. Tool continuations do not repeat them. `before_provider_request` restores a missing full role block in OpenAI Responses/Codex Responses, Chat Completions with an existing system/developer message, or TRAE raw-chat requests with `config_name`, `model_name` and an existing system/developer message in `messages`. It preserves host instructions, tools and result content; TRAE routing fields remain unchanged, without adding a synthetic `model` field. Already-present role blocks are not duplicated, and unknown or malformed formats still warn. Text and reminders are request-local, not persisted conversation entries.

Run the model-free consumer fixture from this repository:

```sh
node adapters/pi/test.mjs
```

It imports the generated entry, registers and invokes its callbacks, and checks source delivery, role isolation, completion routing, repeat projection, provider filtering, non-GPT exclusion, payload preservation and off/reset controls. It does not contact a provider.

Thanks to [SpadeLushen/pi-gpt-with-taste](https://github.com/SpadeLushen/pi-gpt-with-taste) for the Pi port and its request-local injection and final-payload guard. This adapter adapts its MIT-licensed transport at commit `07013409c19fe307d0a951ef5f2b3f72f4c837b3`; `PROVENANCE.md` records the adopted code and changes, and `THIRD_PARTY_LICENSE` retains the license.

API references: [Pi extension types](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts), [system prompt implementation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/system-prompt.ts).
