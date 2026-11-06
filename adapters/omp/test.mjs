import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {consumer, emit, user, assistant, tool, countSteers} from '../pi/fixture.mjs';

const {module, sources, files, recipe, api, ctx, output} = await consumer('omp');
const omp = api();
module.default(omp);
const taste = omp.commands.get('taste');
const complete = taste.getArgumentCompletions;
const completionValues = prefix => complete(prefix)?.map(item => item.value) ?? null;
assert.deepEqual(completionValues(''), ['status', 'on', 'off', 'steer on', 'steer off', 'reset']);
assert.deepEqual(completionValues('st'), ['status', 'steer on', 'steer off']);
assert.deepEqual(completionValues('steer '), ['steer on', 'steer off']);
assert.deepEqual(completionValues('steer of'), ['steer off']);
assert.equal(complete('unknown'), null);
assert.ok(complete('').every(item => item.label === item.value && item.description));
assert.deepEqual([...omp.handlers.keys()], ['before_agent_start', 'context', 'tool_result', 'before_provider_request']);
assert.throws(() => module.default(omp), /only one/);
assert.equal(omp.handlers.get('context').length, 1);
for (const [key, name] of Object.entries(recipe.meta.texts)) assert.ok(files.get(name).endsWith(recipe.texts[key]));
const host = ['HOST BUILTIN TOOLS', '<project-context>HOST ENVIRONMENT</project-context>', 'HOST CHILD ASSIGNMENT'];
const mainCtx = {...ctx, model: {provider: 'custom-openai', id: 'gpt-fixture'}};
const prepare = (systemPrompt = host, runtime = omp, context = mainCtx) => emit(runtime, 'before_agent_start', {systemPrompt, prompt: 'task'}, context);
const prepared = await prepare();
assert.deepEqual(prepared.systemPrompt.slice(0, 3), host);
assert.equal(prepared.systemPrompt.length, 4);
assert.ok(prepared.systemPrompt[3].includes(sources.main));
assert.deepEqual((await prepare(prepared.systemPrompt)).systemPrompt, prepared.systemPrompt);
assert.equal(host.length, 3);
const project = async (messages, runtime = omp, context = mainCtx) => (await emit(runtime, 'context', {messages}, context)).messages;
const input = [user];
const projected = await project(input);
assert.equal(input.length, 1);
assert.equal(countSteers(projected), 1);
assert.ok(projected[1].content.includes(sources.userSteer));
assert.deepEqual(await project(projected), projected);
assert.equal(countSteers(await project([user, assistant, tool])), 0);
assert.equal(countSteers(await project([user, assistant, tool, {...user, timestamp: 4}])), 1);

const childCtx = {...mainCtx, agent: {kind: 'sub', id: 'Child', name: 'task', depth: 0, parentId: 'Main'}};
const child = api();
module.default(child);
const childPrompt = await prepare(host, child, childCtx);
assert.deepEqual(childPrompt.systemPrompt.slice(0, 3), host);
assert.ok(childPrompt.systemPrompt[3].includes(sources.sub));
const childMessages = await project([user], child, childCtx);
assert.ok(childMessages[1].content.includes(sources.subSteer));
assert.ok(!childMessages[1].content.includes(sources.userSteer));
await assert.rejects(prepare(host, child, {...ctx, agent: undefined}), /agent identity/);
const independentEntry = await import(pathToFileURL(path.join(output, 'independent.js')));
const independent = api();
independentEntry.default(independent);
const independentPrompt = (await prepare(host, independent)).systemPrompt;
assert.ok(independentPrompt[3].includes(sources.independent));
assert.ok(!independentPrompt[3].includes(sources.sub));
assert.equal(countSteers(await project([user], independent)), 0);

// R1: OMP rebinds the root's factory for native Task and depth-zero /tan
// sessions. Native child identity wins even over an explicit root role.
for (const factory of [independentEntry.default,
  module.createTasteExtension({role: 'main'}), module.createTasteExtension({role: 'sub'})]) {
  for (const agent of [
    {kind: 'sub', id: 'TaskChild', name: 'task', depth: 1, parentId: 'Main'},
    {kind: 'sub', id: 'TanChild', name: 'sub', depth: 0, parentId: 'Main'},
  ]) {
    const rebound = api();
    factory(rebound);
    const nativeChild = {...mainCtx, agent};
    const prompt = (await prepare(independentPrompt, rebound, nativeChild)).systemPrompt;
    assert.deepEqual(prompt.slice(0, 3), host);
    assert.equal(prompt.length, 4);
    assert.ok(prompt[3].includes(sources.sub));
    assert.ok(!prompt[3].includes(sources.main));
    assert.ok(!prompt[3].includes(sources.independent));
    const messages = await project([user], rebound, nativeChild);
    assert.equal(countSteers(messages), 1);
    assert.ok(messages[1].content.includes(sources.subSteer));
    assert.ok(!messages[1].content.includes(sources.userSteer));
  }
}

const result = {toolName: 'task', toolCallId: 'task-1', content: [{type: 'text', text: 'original child output'}],
  details: {results: [{exitCode: 0, output: 'finished'}], totalDurationMs: 10}, isError: false};
const original = structuredClone(result);
assert.deepEqual(await emit(omp, 'tool_result', result, mainCtx), {additionalContext: sources.agentSteer});
assert.deepEqual(result, original);
assert.equal(await emit(child, 'tool_result', result, childCtx), undefined);
for (const event of [
  {...result, toolName: 'bash'}, {...result, isError: true},
  {...result, details: {results: []}},
  {...result, details: {results: [{exitCode: 1}]}},
  {...result, details: {results: [{exitCode: 0, aborted: true}]}},
  {...result, details: {results: [{exitCode: 0, error: 'timeout'}]}},
  {...result, details: {results: [{exitCode: 0}], async: {state: 'running', jobId: 'job', type: 'task'}}},
  {...result, details: {status: 'completed'}},
]) assert.equal(await emit(omp, 'tool_result', event, mainCtx), undefined);

const delivery = {role: 'custom', customType: 'async-result', attribution: 'agent', display: true,
  content: 'original async result', details: {jobs: [{jobId: 'job-1', type: 'task', status: 'completed'}]}, timestamp: 4};
const delivered = await project([assistant, delivery]);
assert.equal(delivered[1], delivery);
assert.ok(delivered[2].content.includes(sources.agentSteer));
assert.equal(countSteers(await project([assistant, delivery], child, childCtx)), 0);
for (const message of [
  {...delivery, details: {jobs: [{type: 'bash', status: 'completed'}]}},
  {...delivery, details: {jobs: [{type: 'task', status: 'failed'}]}},
  {...delivery, details: {jobs: [{type: 'task', status: 'running'}]}},
  {...delivery, attribution: 'user'}, {...delivery, details: {jobs: []}},
]) assert.equal(countSteers(await project([assistant, message])), 0);
for (const {options, model, active} of [
  {model: mainCtx.model, active: true},
  {model: {provider: 'openai', id: 'gpt-fixture'}, active: true},
  {model: {provider: 'openai-codex', id: 'gpt-fixture'}, active: true},
  {model: {provider: 'custom-openai', id: 'other-model'}, active: false},
  {model: {provider: 'openai', id: 'other-model'}, active: false},
  {options: {providers: ['custom-openai']}, model: mainCtx.model, active: true},
  {options: {providers: ['openai', 'openai-codex']}, model: mainCtx.model, active: false},
  {options: {providers: []}, model: mainCtx.model, active: false},
  {options: {providers: []}, model: ctx.model, active: false},
  {options: {modelIdPattern: /^custom-gpt$/}, model: {provider: 'custom-openai', id: 'custom-gpt'}, active: true},
  {options: {modelIdPattern: /^custom-gpt$/}, model: mainCtx.model, active: false},
]) {
  for (const baseCtx of [mainCtx, childCtx]) {
    const scoped = api();
    (options === undefined ? module.default : module.createTasteExtension(options))(scoped);
    const scopedCtx = {...baseCtx, model};
    const isMain = scopedCtx.agent.kind === 'main';
    const prompt = (await prepare(prepared.systemPrompt, scoped, scopedCtx)).systemPrompt;
    assert.deepEqual(prompt.slice(0, 3), host);
    assert.equal(prompt.length, active ? 4 : 3);
    if (active) assert.ok(prompt[3].includes(sources[isMain ? 'main' : 'sub']));
    const messages = await project(projected, scoped, scopedCtx);
    assert.equal(countSteers(messages), active ? 1 : 0);
    if (active) assert.ok(messages[1].content.includes(sources[isMain ? 'userSteer' : 'subSteer']));
    assert.deepEqual(await emit(scoped, 'tool_result', result, scopedCtx),
      active && isMain ? {additionalContext: sources.agentSteer} : undefined);
    const payload = {model: 'routed-physical-model', instructions: 'HOST SYSTEM', input: []};
    const guarded = await emit(scoped, 'before_provider_request', {payload}, scopedCtx);
    if (active) assert.ok(guarded.instructions.includes(sources[isMain ? 'main' : 'sub']));
    else assert.equal(guarded, undefined);
  }
}

for (const [runtime, context, role] of [[omp, mainCtx, 'main'], [child, childCtx, 'sub']]) {
  for (const payload of [
    {model: 'gpt-fixture', instructions: 'HOST SYSTEM', input: [{role: 'user', content: 'task'}],
      tools: [{name: 'task', parameters: {type: 'object'}}], metadata: {request: 'responses'}, parallel_tool_calls: false},
    {model: 'gpt-fixture', messages: [{role: 'developer', content: 'HOST SYSTEM', keep: 1}, user],
      tools: [{type: 'function', function: {name: 'task', parameters: {type: 'object'}}}], metadata: {request: 'chat'}},
    {model: 'gpt-fixture', messages: [{role: 'system', content: [{type: 'text', text: 'HOST SYSTEM'}], keep: 1}, user],
      tools: [{type: 'function', function: {name: 'task'}}], metadata: {request: 'chat-blocks'}},
    {config_name: 'gpt-fixture', model_name: 'routed-physical-model',
      messages: [{role: 'system', content: [{type: 'text', text: 'HOST SYSTEM'}]}, user],
      tools: [{type: 'function', function: {name: 'task', parameters: '{"type":"object"}'}}],
      session_id: 'fixture-session', conversation_id: 'fixture-session', user_input: user.content,
      is_preset: true, access_type: 4, parallel_tool_calls: true},
  ]) {
    const snapshot = structuredClone(payload);
    const notices = [];
    const requestCtx = {...context,
      model: payload.config_name ? {provider: 'trae', id: 'gpt-fixture'} : context.model,
      ui: {notify: (text, level) => notices.push({text, level})}};
    const guarded = await emit(runtime, 'before_provider_request', {payload}, requestCtx);
    const fullBlock = `<gpt-with-taste>\n${sources[role]}\n</gpt-with-taste>`;
    if (payload.input) {
      assert.equal(guarded.instructions, `HOST SYSTEM\n\n${fullBlock}`);
      assert.deepEqual({...guarded, instructions: payload.instructions}, payload);
    } else {
      const content = payload.messages[0].content;
      assert.deepEqual(guarded.messages[0], {...payload.messages[0],
        content: typeof content === 'string' ? `${content}\n\n${fullBlock}` : [...content, {type: 'text', text: fullBlock}]});
      assert.deepEqual(guarded.messages.slice(1), payload.messages.slice(1));
      assert.deepEqual({...guarded, messages: payload.messages}, payload);
    }
    assert.deepEqual(payload, snapshot);
    assert.equal(await emit(runtime, 'before_provider_request', {payload: guarded}, requestCtx), undefined);
    assert.deepEqual(notices, []);
  }
}
for (const payload of [
  {config_name: 'gpt-fixture', messages: [{role: 'system', content: 'HOST SYSTEM'}]},
  {config_name: 'gpt-fixture', model_name: 42, messages: [{role: 'system', content: 'HOST SYSTEM'}]},
  {config_name: 'gpt-fixture', model_name: 'physical-model', input: [], instructions: 'HOST SYSTEM'},
  {config_name: 'gpt-fixture', model_name: 'physical-model', messages: [user]},
]) {
  const unsupported = api();
  module.default(unsupported);
  const notices = [];
  const requestCtx = {...mainCtx, model: {provider: 'trae', id: 'gpt-fixture'},
    ui: {notify: (text, level) => notices.push({text, level})}};
  const snapshot = structuredClone(payload);
  assert.equal(await emit(unsupported, 'before_provider_request', {payload}, requestCtx), undefined);
  assert.deepEqual(payload, snapshot);
  assert.deepEqual(notices.map(notice => notice.level), ['warning']);
}
await omp.commands.get('taste').handler('off', mainCtx);
assert.deepEqual((await prepare(prepared.systemPrompt)).systemPrompt, host);
assert.equal(countSteers(await project(projected)), 0);
assert.equal(await emit(omp, 'tool_result', result, mainCtx), undefined);
assert.equal(await emit(omp, 'before_provider_request', {payload: {model: 'gpt-fixture', input: []}}, mainCtx), undefined);
await omp.commands.get('taste').handler('reset', mainCtx);
assert.equal(countSteers(await project([user])), 1);
console.log('OMP consumer fixture passed: generated source, provider/model scope, native Main/Sub at depth 0, host blocks, settled Task/async routing, original results, payload preservation, duplicate/off/reset.');
