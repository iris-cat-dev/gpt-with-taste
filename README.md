<p align="right">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/hero-banner-light.svg">
  <img alt="GPT with Taste — Better judgment. Better taste. Less ceremony." src="assets/hero-banner-light.svg" width="100%">
</picture>

<p align="center">
  A drop-in behavioral recipe across coding harnesses: make ordinary decisions, digest complexity, and deliver work with engineering and visual craft.<br>
  Built for the GPT reasoning family, especially GPT-6.1 Sol and GPT-6 Astra. Replies follow the language you write in.
</p>

<p align="center">
  <a href="#harnesses">Harnesses</a> ·
  <a href="#install">Install Codex</a> ·
  <a href="#what-changes">What changes</a> ·
  <a href="#featured-case">Comparison</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#research">Research</a>
</p>

---

<a id="harnesses"></a>

## Harnesses

GPT with Taste compiles from a single behavioral recipe into native instructions and event steering for each supported host:

| Harness | Integration | Setup Guide |
| --- | --- | --- |
| **OpenAI Codex** | Native model instructions & hooks overlay | [docs/install.md](docs/install.md) (or quick start below) |
| **Claude Code** | Main instructions append & native plugin (Sub + 3 Steer) | [docs/harnesses/claude.md](docs/harnesses/claude.md) |
| **Kiki** | Native Recipe (general bundle & Sol/Astra compat) | [docs/harnesses/kiki.md](docs/harnesses/kiki.md) |
| **Pi** | Request-local extension with payload guard | [docs/harnesses/pi.md](docs/harnesses/pi.md) |
| **Oh My Pi (OMP)** | Native identity-aware extension | [docs/harnesses/omp.md](docs/harnesses/omp.md) |
| **DeepSeek Harness (dsh)** | Native Cordis plugin with request-local steer | [docs/harnesses/dsh.md](docs/harnesses/dsh.md) |

Pi and OMP apply to selected `gpt-*` models from any provider by default, without requiring an official subscription or fixed provider ID. Credentials and routing remain configured in the host. For custom model IDs or an optional provider allowlist, see the respective setup guide.

Running in another host? See [docs/harnesses/porting.md](docs/harnesses/porting.md). Maintainers edit the single English authoring source in `recipe/` and compile across targets: see [docs/authoring.md](docs/authoring.md).

---

<a id="install"></a>

## Install · Codex

With Node.js 22 or newer installed:

```sh
git clone https://github.com/NB-Corp/gpt-with-taste.git
cd gpt-with-taste
node scripts/install.mjs --hooks
```

We recommend Hooks for multi-turn work in Codex Desktop: user submissions, child startup and supported wait results receive scoped reminders. Later child-input coverage depends on the [client entry point](docs/install.md#runtime-coverage). For a prompt-only installation, run `node scripts/install.mjs` instead. Neither route needs npm packages.

Both routes install into the active `CODEX_HOME` (otherwise `~/.codex`), write the two managed prompt files, and point `model_instructions_file` at the main one. Your model, provider, effort, authentication, permissions, MCP servers, roles, and `AGENTS.md` remain unchanged. To target another home, add `--home` with a quoted absolute path, for example `--home "C:/Users/you/.codex"`.

With `--hooks`, review and trust the three installed definitions in Codex Desktop under **Settings → Hooks**, or in the interactive terminal with `/hooks`. Enable only the events you want. Open a **new Codex session** after installation.

Check updates with `node scripts/check-updates.mjs`. Installation also checks official metadata before writing; add `--skip-update-check` for offline installation. [Update instructions](docs/install.md#update-or-resolve-a-conflict) cover the installed components and customized checkouts.

Prefer to delegate? Give your coding assistant this repository and [docs/install-for-ai.md](docs/install-for-ai.md). To recover the managed state, use [docs/recovery.md](docs/recovery.md). The complete installation contract is in [docs/install.md](docs/install.md).

---

<a id="what-changes"></a>

## What changes

GPT with Taste puts judgment into the outcome: choose sensible defaults, preserve supported claims, synthesize useful collaborator results, and finish work with care.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/comparison-diagram-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/comparison-diagram-light.svg">
  <img alt="Default behavior vs. GPT with Taste — five everyday contrasts" src="assets/comparison-diagram-light.svg" width="100%">
</picture>

The recipe combines judgment, continuous execution, collaboration, and engineering and visual craft. Explore the principles in [Research](docs/research.md), or inspect complete runs, task inputs, and side-by-side outputs in the [Case Archive](docs/cases.md) and [Web Comparison](https://nb-corp.github.io/gpt-with-taste/).

---

<a id="featured-case"></a>

## Comparison · From installation logs to a first task

> **Task request**: Use `notes.md` to write a Chinese getting-started guide for a colleague who has just finished installing. Save it as `START_HERE.md`.

The visible improvement is straightforward: get the reader started first, while installation audits and process disclaimers step out of the way.

[![Codex default vs. GPT with Taste: representative excerpts, with unnecessary self-justification highlighted](assets/case-first-use-en.png)](https://nb-corp.github.io/gpt-with-taste/)

Inspect full inputs, generated documents, and run conditions: [Task & run conditions](docs/cases/codex-first-use/input.md) · [Web comparison page](https://nb-corp.github.io/gpt-with-taste/) · [Case index](docs/cases.md).

---

<a id="how-it-works"></a>

## How it works

1. **The system prompt sets standing priorities.** It covers judgment, execution, collaboration, and craft across hosts. The instructions are English; replies follow your latest language.
2. **Steer refreshes priorities at supported events.** Using local hooks, extensions, or native recipe events, reminders route user context to main, scoped reminders to delegated agents, and input-consumption guidance to main upon receiving collaborator results.

Standalone prompt definitions provide the complete behavior for each agent role; supported harnesses connect the matching reminder paths.

---

<a id="research"></a>

## Research

[docs/research.md](docs/research.md) details the findings, prompt architecture, and iteration loop behind the recipe: how defensive writing affects the reader's experience, why models need room for ordinary judgment, and how collaborator findings are turned into direct action.

---

<p align="center">
  <a href="LICENSE">MIT License</a> · Credits: <a href="https://github.com/SpadeLushen/pi-gpt-with-taste">SpadeLushen/pi-gpt-with-taste</a> · Community friend link: <a href="https://linux.do/">Linux DO</a>
</p>
