# Prompt map

The default product is the complete main prompt. One source serves the GPT model family, including GPT-6.1 Sol and GPT-6 Astra; it does not select a provider, model, or reasoning effort. The subagent prompt is also complete on its own. The three steer files are optional reminders for particular moments, not a second layer needed to recover missing capabilities.

## Choose the source for the reader

| Source | Reader and placement | Job |
| --- | --- | --- |
| [`recipe/main.md`](../recipe/main.md) | The main agent's instruction context | Own the user's result, make decisions, execute or delegate, integrate evidence, and deliver finished work. |
| [`recipe/sub.md`](../recipe/sub.md) | A delegated agent's instruction context, alongside its actual role and assignment | Own the complete scoped result while preserving role, leaf, tool, support, and write boundaries. |
| [`recipe/independent.md`](../recipe/independent.md) | An independent host invocation without a parent | Apply role-neutral work principles and complete the current assignment. |
| [`recipe/user-steer.md`](../recipe/user-steer.md) | Optional reminder near each submitted user request to the main agent | Reconnect the request to the current goal, make ordinary choices, preserve existing usage, and select reader-useful content. |
| [`recipe/sub-steer.md`](../recipe/sub-steer.md) | Optional reminder with input to a delegated agent | Continue the scoped assignment, finish local work, and report only real early coordination needs. |
| [`recipe/agent-steer.md`](../recipe/agent-steer.md) | Optional reminder when the main agent receives a collaborator message or task result | Reconcile evidence and decide before routing only the missing action-changing information. |

These are the complete English author sources. [The compiler](authoring.md) generates `dist/<harness>/` and the existing Codex `prompts/` paths from them. Each adapter supplies the harness's native loading and event interfaces; the shared instructions follow the current harness rather than naming another host's tools. English source does not fix the response language: the main and subagent prompts explicitly follow the user's latest conversational language, including a switch, while project artifacts follow project conventions and explicit artifact requirements. An explicitly chosen persona overrides the default warm, lively, opinionated voice.

## Where the capabilities live

| Capability | Main prompt | Subagent prompt |
| --- | --- | --- |
| Full purpose, current stage, complete outcome, and few material questions | “Understand the purpose and the current assignment” | “Keep the assignment intact” |
| Decisive judgment and taste in engineering, writing, visuals, and games | Opening; “Make taste visible in the work” | Opening; “Make a clear quality judgment” |
| Continuous execution, reuse, diagnosis, and necessary adjacent repairs | “Take the shortest complete route” | “Reuse sound work and finish the implementation” |
| Existing entry points, data meaning, and conditions of use | “Take the shortest complete route” | “Reuse sound work and finish the implementation” |
| Current-use abstractions, boundary parsing, typed guarantees, invariant failures, and error propagation | “Take the shortest complete route” | “Reuse sound work and finish the implementation” |
| Direct work or delegation, one active owner, and actual scope limits | “Collaborate around real dependencies” | “Keep the assignment intact” |
| Synthesis before routing, stable handoffs, and early messages only for action-changing conflicts | “Collaborate around real dependencies” | “Hand back a result the parent can use” |
| Falsifiable questions, strong fair baselines, quantitative reasoning, counterevidence, and research continuation | “When the task involves research” | “When the task involves research” |
| Consequence-based verification, evidence reuse, no redundant smoke checks, recovery, and the ban on nonessential hashing | “Verify what determines acceptance” | “Verify the risks that determine delivery” |
| Reader First selection, whole-sentence deletion, useful explanations, and integrated revision | “Write for the reader's next action” | “Hand back a result the parent can use”; “Write for the recipient's next action” |
| Actual permission, source identity, credentials, task continuity, and appropriate memory | “Respect authority, sources, and continuity” | “Preserve authority and continuity” |

## Why the rules are grouped this way

**Purpose comes before execution.** The prompts distinguish discussing, assessing, gathering evidence, and implementing at the point where the agent interprets the assignment. Ordinary judgment is autonomous within the authorized stage. A follow-up question refines ongoing work rather than silently ending it.

**Taste is a delivery standard.** It covers choosing a worthwhile direction, economical abstractions, deliberate visual hierarchy, readable copy, and inspecting the actual result. It remains a substantive quality obligation rather than an upbeat tone or a prescribed visual theme.

**Compatibility belongs with implementation.** Preserving an old call means preserving its entry point, data meaning, and conditions of use. New prerequisites belong only to the new capability. Keeping these together prevents a new feature from quietly narrowing established usage.

**Engineering checks follow trust and contracts.** Main, Sub, and Independent favor abstractions for current needs, parse external inputs at trust boundaries, express constraints and absence in types, and rely on valid upstream guarantees. Internal invariant violations fail visibly; specific errors are caught for understood recovery or top-level reporting, with useful context and the original cause preserved. Focused tests address uncertainty about internal guarantees without replacing necessary boundary validation. Money, authorization, security, destructive actions, public APIs, and concrete external-service failures retain appropriate safeguards.

**Research is conditional, not diminished.** Its own section keeps routine development from acquiring a mandatory research process. Both complete prompts retain falsifiable claims, fair baselines, traceable quantities and assumptions, original-source checks, and faithful positive and negative evidence. The main prompt also retains topic selection and cross-line synthesis. Counterevidence updates the topic, mechanism, configuration, or contribution it actually affects; a failed configuration need not end a worthwhile research goal. The subagent follows that reasoning within the parent's topic and authorization.

**Collaboration centers on ownership and decisions.** The main agent may work directly or delegate. The collaboration sections distinguish receiving a result, adopting it, delivering it, and its actual consumption. The exhibition-loan example makes recipient-specific routing concrete: a framing dimensions request and a curator's installation conclusion are different messages. The subagent has the same obligation to judge and finish local work, without inheriting the parent's coordination powers.

**Reader First is selection before phrasing.** The prompts ask whether a sentence answers the reader's present question before asking how to polish it. Useless material is deleted, not restyled or moved to small print. The matrix-multiplication example retains the cost explanation and removes an endorsement of the paper's wording. The BLEU example keeps the observed result and the authors' interpretation together. These examples distinguish useful explanation from defensive repetition without weakening supported claims.

**Verification follows the affected action.** Necessary behavioral, visual, and scientific evidence remains required. Existing verification covering the current change and key paths rules out another smoke check. Changed implementations, inputs, or relevant premises, and concrete uncovered risks call for checks of the affected area only. Main, Sub, Independent, and all three Steers carry this rule. Reassurance reruns, unrelated review chains, and nonessential hashes are explicitly rejected. Recovery and permission conditions appear before the action they constrain, not as new blockers for independent ready work.

## Codex integration decisions

The Codex adapter retains the existing instruction-file and local-plugin entry points. Shared behavior follows the current runtime's tools, role restrictions, and event semantics. Notification-driven continuation applies when the runtime guarantees completion notifications; waiting follows the supported tool contract and a real dependency. A child resolves its promised dependencies before its final result.

Selecting [optional hooks](install.md#add-optional-per-turn-steering) assembles the single author sources into a local marketplace and installs `gpt-with-taste@gpt-with-taste-local` through the normal Codex plugin CLI. The plugin configures three source-specific routes:

- `UserPromptSubmit`: `user-steer.md` addresses main; a child identified by `agent_id` or its recorded child session receives `sub-steer.md`.
- `SubagentStart`: `sub-steer.md` enters the child alongside its role and task. The child identity and initial turn suppress a matching paired input once. Identity remains available to route later events without assuming parent and child session IDs match.
- `PostToolUse`: a finite shared map recognizes bare `wait_agent` and dotted/flattened `multi_agent_v1` and `collaboration` names. Main receives `agent-steer.md` for a non-timeout `{completed: string}` status receipt or the current collaboration mailbox wake. The latter asks Main to consume pending input without asserting task completion. Original results stay intact; incomplete, timed-out, not-found, shell/MCP and child-session results select no Main reminder.

`SubagentStop` controls continuation inside the child. Later child inputs are routed only when the client dispatches `UserPromptSubmit`; Codex 0.162.1 native `followup_task` did not dispatch that event in the runtime probe. Dispatch arguments and automatic completion notifications remain intact. The complete `sub.md` remains available for roles the user chooses.

The Windows launcher invokes Node with PowerShell's `&` call operator and reads the official `PLUGIN_ROOT` environment value. Event JSON supplies the consumer and turn identity. Named diagnostics identify missing metadata or source/state failures; optional audit logging never blocks a successful context response. See [installation](install.md#add-optional-per-turn-steering) for setup and trust.

The previously tested Codex `0.162.0-alpha.17.2` `exec resume` entry did not dispatch plugin events. For that entry point, use the complete main prompt. `--check` checks installed files and registration; runtime delivery is observed in the receiving agent's context.

The delegated role's developer instructions were delivered, while its Sub instruction-file setting did not replace inherited Main base instructions. Complete Sub is a source for a chosen role's instruction composition, not an automatically installed child base. Follow [role setup](install.md#use-the-complete-subagent-prompt-for-a-selected-role), preserving the role's own contract and the runtime's actual permission boundaries.
